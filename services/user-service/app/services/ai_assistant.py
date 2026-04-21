import re
from typing import AsyncGenerator

from langchain_classic.agents import AgentExecutor, create_react_agent
from langchain_classic.agents.output_parsers import ReActSingleInputOutputParser
from langchain_core.agents import AgentFinish
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.services.ai_tools import search_restaurants
from app.services.conversation_manager import conversation_manager
from app.services.preferences_loader import (
    format_preferences_for_agent,
    load_user_preferences,
)
from app.services.tavily_tool import tavily_search

_settings = get_settings()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0.7,
    google_api_key=_settings.GEMINI_API_KEY,
)

tools = [search_restaurants, tavily_search]

AGENT_PROMPT = PromptTemplate.from_template(
    """You are a helpful restaurant recommendation assistant for a Yelp-like platform.

User Preferences:
{user_preferences}

You have access to the following tools:
{tools}

Tool names: {tool_names}

TOOL SELECTION GUIDE:
- Use "search_restaurants" ONLY for cities available in our local database (e.g. San Jose, San Francisco, and other Bay Area cities).
- Use "tavily_search_results_json" for:
  - Locations outside our database coverage (e.g. Dubai, New York, London, Tokyo, etc.)
  - Real-time queries: "open now", "tonight", "trending", "new openings"
  - Anything requiring current or up-to-date information (hours, events, recent reviews)
- If "search_restaurants" returns no results or irrelevant results for a location, try "tavily_search_results_json" next.

RESPONSE FORMAT:
- When using tavily_search_results_json results, present your Final Answer as a short intro sentence followed by a numbered list.
- Each item should be: "<number>. <Restaurant Name> — <cuisine type>, <brief description in one sentence>."
- Include at most 5 restaurants. Do NOT dump raw web content.

IMPORTANT RULES:
- For simple greetings or casual messages, respond directly with Final Answer without using any tools.
- After receiving ONE tool result, immediately write your Final Answer. Do NOT call the same tool again with a similar query.
- Use at most 2 tool calls total per question.
- Always end your response with "Final Answer:" followed by your recommendation.

Use this format:
Question: the user's question
Thought: think about what to do
Action: the tool to use (one of [{tool_names}])
Action Input: the input to the tool
Observation: the tool's result
Thought: I now know the final answer
Final Answer: your recommendation to the user.

Chat History:
{chat_history}

Question: {input}
{agent_scratchpad}"""
)


_FINAL_ANSWER_MARKER = "Final Answer:"
_FINAL_ANSWER_LINE_PATTERN = re.compile(r"(?im)^\s*Final Answer\s*:\s*")
_REACT_PREFIX_PATTERN = re.compile(
    r"^\s*(Thought|Action|Action Input|Observation)\s*:\s*",
    re.IGNORECASE,
)
_REACT_LINE_PATTERN = re.compile(
    r"^\s*(Thought|Action|Action Input|Observation)\s*:\s*.*$",
    re.IGNORECASE,
)
_GENERIC_FALLBACK_RESPONSE = (
    "I can help with restaurant recommendations. "
    "Could you share a few more details?"
)


def _dedupe_repeated_text(text: str) -> str:
    """Detect and remove exact duplicate halves from LLM output."""
    length = len(text)
    if length < 20:
        return text
    half = length // 2
    # Check if the text is the same block repeated twice
    first_half = text[:half].strip()
    second_half = text[half:].strip()
    if first_half == second_half:
        return first_half
    return text


def _sanitize_agent_output(raw_output: str) -> str:
    """Return a user-facing answer without ReAct scaffolding."""
    text = (raw_output or "").strip()
    if not text:
        return _GENERIC_FALLBACK_RESPONSE

    marker_matches = list(_FINAL_ANSWER_LINE_PATTERN.finditer(text))
    if marker_matches:
        marker = marker_matches[-1]
        text = text[marker.end() :].strip()
    else:
        if re.search(
            r"(?i)\b(Thought|Action|Action Input|Observation)\s*:", text
        ):
            return _GENERIC_FALLBACK_RESPONSE

        cleaned_lines: list[str] = []
        for line in text.splitlines():
            if _REACT_LINE_PATTERN.match(line):
                continue
            if line.strip():
                cleaned_lines.append(line.strip())
        text = "\n".join(cleaned_lines).strip()
        text = _REACT_PREFIX_PATTERN.sub("", text).strip()

    if not text:
        return _GENERIC_FALLBACK_RESPONSE
    return _dedupe_repeated_text(text)


def _coerce_chunk_text(chunk: object) -> str:
    token = chunk.content if hasattr(chunk, "content") else ""
    if isinstance(token, list):
        return "".join(
            block.get("text", "")
            for block in token
            if isinstance(block, dict) and block.get("type") == "text"
        )
    if isinstance(token, str):
        return token
    return str(token)


# Pattern: "1. Restaurant Name — Cuisine, description."
_NUMBERED_ITEM_PATTERN = re.compile(
    r"^\s*\d+\.\s+"
    r"(?:\*\*)?(?P<name>[^—\-*]+?)(?:\*\*)?"  # name (with optional bold **)
    r"\s*[—\-]+\s*"
    r"(?P<cuisine>[^,]+)"
    r",\s*(?P<desc>.+)$",
)


def _parse_web_recommendations(response_text: str) -> list[dict]:
    """Parse the LLM's numbered-list response into structured recommendation cards."""
    restaurants: list[dict] = []
    for line in response_text.splitlines():
        match = _NUMBERED_ITEM_PATTERN.match(line.strip())
        if not match:
            continue
        name = match.group("name").strip().strip("*")
        cuisine = match.group("cuisine").strip()
        restaurants.append({
            "id": f"web-{hash(name) % 100000}",
            "name": name,
            "cuisines": cuisine,
            "pricing_tier": "",
            "rating": None,
        })
    return restaurants[:5]


def _parse_restaurant_lines(tool_output: str) -> list[dict]:
    restaurants: list[dict] = []
    for line in tool_output.splitlines():
        line = line.strip().lstrip("- ")
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 5:
            continue
        try:
            r_id = parts[0].replace("ID:", "").strip()
            rating_raw = parts[4].replace("Rating:", "").replace("★", "").strip()
            restaurants.append(
                {
                    "id": r_id,
                    "name": parts[1],
                    "cuisines": parts[2],
                    "pricing_tier": parts[3],
                    "rating": float(rating_raw) if rating_raw else None,
                }
            )
        except (ValueError, IndexError):
            continue
    return restaurants


def _dedupe_recommendations(recommendations: list[dict]) -> list[dict]:
    unique: list[dict] = []
    seen_ids: set[str] = set()
    for restaurant in recommendations:
        restaurant_id = restaurant.get("id")
        if isinstance(restaurant_id, str) and restaurant_id:
            if restaurant_id in seen_ids:
                continue
            seen_ids.add(restaurant_id)
        unique.append(restaurant)
    return unique


def _build_recommendation_fallback(recommendations: list[dict]) -> str:
    """Build a deterministic, user-facing answer from tool results."""
    if not recommendations:
        return (
            "I could not find a strong match yet. "
            "Try adding cuisine, area, or budget "
            "(for example: 'romantic Italian in San Jose under $$')."
        )

    top = recommendations[0]
    top_name = top.get("name") or "this restaurant"
    top_cuisine = top.get("cuisines") or "varied cuisine"
    top_price = top.get("pricing_tier") or "N/A"
    top_rating = top.get("rating")
    rating_text = f"{top_rating}" if isinstance(top_rating, (int, float)) else "N/A"
    alternatives_text = (
        "I also included a few alternatives below."
        if len(recommendations) > 1
        else "No alternatives available."
    )
    return (
        f"A good pick is {top_name} ({top_cuisine}, {top_price}, "
        f"rating {rating_text}). {alternatives_text}"
    )


def _finalize_response(raw_output: str, recommendations: list[dict]) -> str:
    """Prefer sanitized model answer, then reliable recommendation fallback."""
    sanitized = _sanitize_agent_output(raw_output)
    if sanitized == _GENERIC_FALLBACK_RESPONSE:
        return _build_recommendation_fallback(recommendations)
    return sanitized


class TolerantReActParser(ReActSingleInputOutputParser):
    def parse(self, text: str):
        try:
            return super().parse(text)
        except Exception:
            return AgentFinish({"output": text}, text)


async def _build_executor(
    user_id: str,
    session_id: str,
    return_intermediate_steps: bool = False,
) -> AgentExecutor:
    """Build the LangChain agent executor with pre-loaded memory and prefs."""
    memory = await conversation_manager.get_memory(user_id, session_id)
    prefs = await load_user_preferences(user_id)
    prefs_text = format_preferences_for_agent(prefs)
    bound_prompt = AGENT_PROMPT.partial(user_preferences=prefs_text)

    agent = create_react_agent(
        llm=llm,
        tools=tools,
        prompt=bound_prompt,
        output_parser=TolerantReActParser(),
    )
    return AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        handle_parsing_errors=True,
        max_iterations=12,
        max_execution_time=60,
        early_stopping_method="generate",
        return_intermediate_steps=return_intermediate_steps,
    )


async def chat(
    user_id: str, message: str, session_id: str
) -> tuple[str, list[dict]]:
    executor = await _build_executor(
        user_id, session_id, return_intermediate_steps=True
    )
    result = await executor.ainvoke({"input": message})

    recommendations: list[dict] = []
    used_tavily = False
    for action, observation in result.get("intermediate_steps", []):
        tool_name = getattr(action, "tool", "")
        if tool_name == "search_restaurants":
            recommendations.extend(_parse_restaurant_lines(str(observation)))
        elif tool_name == "tavily_search_results_json":
            used_tavily = True

    ai_response = _finalize_response(
        str(result.get("output", "")), recommendations
    )

    # For Tavily results, parse the LLM's formatted response into cards
    if used_tavily and not recommendations:
        recommendations = _parse_web_recommendations(ai_response)
    recommendations = _dedupe_recommendations(recommendations)[:5]
    await conversation_manager.save_turn(user_id, session_id, message, ai_response)
    return ai_response, recommendations


async def chat_stream(
    user_id: str, message: str, session_id: str
) -> AsyncGenerator[dict, None]:
    executor = await _build_executor(user_id, session_id)
    collected_restaurants: list[dict] = []
    buffered_text = ""
    is_final_answer_streaming = False

    try:
        async for event in executor.astream_events(
            {"input": message}, version="v2"
        ):
            kind: str = event["event"]
            name: str = event.get("name", "")

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                token = _coerce_chunk_text(chunk)
                if not token:
                    continue

                if is_final_answer_streaming:
                    yield {"type": "token", "content": token}
                    continue

                buffered_text += token
                marker_matches = list(
                    _FINAL_ANSWER_LINE_PATTERN.finditer(buffered_text)
                )
                if not marker_matches:
                    if len(buffered_text) > 4000:
                        buffered_text = buffered_text[-4000:]
                    continue

                is_final_answer_streaming = True
                marker_end = marker_matches[-1].end()
                final_start = buffered_text[marker_end:].lstrip()
                if final_start:
                    yield {"type": "token", "content": final_start}

            elif kind == "on_tool_start":
                yield {
                    "type": "tool_call",
                    "tool": name,
                    "input": str(event["data"].get("input", "")),
                }

            elif kind == "on_tool_end" and name == "search_restaurants":
                raw = str(event["data"].get("output", ""))
                restaurants = _parse_restaurant_lines(raw)
                collected_restaurants.extend(restaurants)
                if restaurants:
                    yield {"type": "tool_result", "restaurants": restaurants}

            elif kind == "on_tool_end" and name == "tavily_search_results_json":
                pass  # Cards will be parsed from LLM's formatted response

            elif kind == "on_chain_end" and name == "AgentExecutor":
                output = event["data"].get("output", {})
                final_response = _finalize_response(
                    str(output.get("output", "")),
                    collected_restaurants,
                )
                # Parse web recommendations from the formatted response
                if not collected_restaurants:
                    collected_restaurants = _parse_web_recommendations(
                        final_response
                    )
                unique_recommendations = _dedupe_recommendations(
                    collected_restaurants
                )[:5]
                await conversation_manager.save_turn(
                    user_id, session_id, message, final_response
                )
                yield {
                    "type": "done",
                    "response": final_response,
                    "recommendations": unique_recommendations,
                    "session_id": session_id,
                }
    except Exception as exc:
        yield {"type": "error", "detail": str(exc)}
