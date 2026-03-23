import re
from typing import AsyncGenerator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_classic.agents import AgentExecutor, create_react_agent
from sqlalchemy.orm import Session
from app.config import get_settings
from app.services.ai_tools import search_restaurants
from app.services.conversation_manager import conversation_manager
from app.services.preferences_loader import load_user_preferences, format_preferences_for_agent
from app.services.tavily_tool import tavily_search

_settings = get_settings()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    temperature=0.7,
    google_api_key=_settings.GEMINI_API_KEY,
)

tools = [search_restaurants, tavily_search]

AGENT_PROMPT = PromptTemplate.from_template("""You are a helpful restaurant recommendation assistant for a Yelp-like platform.

User Preferences:
{user_preferences}

You have access to the following tools:
{tools}

Tool names: {tool_names}

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
{agent_scratchpad}""")


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
_GENERIC_FALLBACK_RESPONSE = "I can help with restaurant recommendations. Could you share a few more details?"


def _sanitize_agent_output(raw_output: str) -> str:
    """Return a user-facing answer without ReAct scaffolding."""
    text = (raw_output or "").strip()
    if not text:
        return _GENERIC_FALLBACK_RESPONSE

    marker_matches = list(_FINAL_ANSWER_LINE_PATTERN.finditer(text))
    if marker_matches:
        marker = marker_matches[-1]
        text = text[marker.end():].strip()
    else:
        # Fallback for parser failures: strip obvious ReAct/planning traces.
        if re.search(r"(?i)\b(Thought|Action|Action Input|Observation)\s*:", text):
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
    return text


def _coerce_chunk_text(chunk: object) -> str:
    token = chunk.content if hasattr(chunk, "content") else ""
    if isinstance(token, list):
        return "".join(
            block.get("text", "") for block in token
            if isinstance(block, dict) and block.get("type") == "text"
        )
    if isinstance(token, str):
        return token
    return str(token)


def _parse_restaurant_lines(tool_output: str) -> list[dict]:
    restaurants: list[dict] = []
    for line in tool_output.splitlines():
        line = line.strip().lstrip("- ")
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 5:
            continue
        try:
            r_id = int(parts[0].replace("ID:", "").strip())
            rating_raw = parts[4].replace("Rating:", "").replace("★", "").strip()
            restaurants.append({
                "id": r_id,
                "name": parts[1],
                "cuisines": parts[2],
                "pricing_tier": parts[3],
                "rating": float(rating_raw) if rating_raw else None,
            })
        except (ValueError, IndexError):
            continue
    return restaurants


def _dedupe_recommendations(recommendations: list[dict]) -> list[dict]:
    unique: list[dict] = []
    seen_ids: set[int] = set()
    for restaurant in recommendations:
        restaurant_id = restaurant.get("id")
        if isinstance(restaurant_id, int):
            if restaurant_id in seen_ids:
                continue
            seen_ids.add(restaurant_id)
        unique.append(restaurant)
    return unique


def _build_recommendation_fallback(recommendations: list[dict]) -> str:
    """Build a deterministic, user-facing answer from tool results."""
    if not recommendations:
        return "I could not find a strong match yet. Try adding cuisine, area, or budget (for example: 'romantic Italian in San Jose under $$')."

    top = recommendations[0]
    top_name = top.get("name") or "this restaurant"
    top_cuisine = top.get("cuisines") or "varied cuisine"
    top_price = top.get("pricing_tier") or "N/A"
    top_rating = top.get("rating")
    rating_text = f"{top_rating}" if isinstance(top_rating, (int, float)) else "N/A"
    return (
        f"A good pick is {top_name} ({top_cuisine}, {top_price}, rating {rating_text}). "
        "I also included a few alternatives below."
    )


def _finalize_response(raw_output: str, recommendations: list[dict]) -> str:
    """Prefer sanitized model answer, then reliable recommendation fallback."""
    sanitized = _sanitize_agent_output(raw_output)
    if sanitized == _GENERIC_FALLBACK_RESPONSE:
        return _build_recommendation_fallback(recommendations)
    return sanitized


from langchain_classic.agents.output_parsers import ReActSingleInputOutputParser
from langchain_core.agents import AgentFinish

class TolerantReActParser(ReActSingleInputOutputParser):
    def parse(self, text: str):
        try:
            return super().parse(text)
        except Exception:
            # ReAct format failed (usually missing "Final Answer:"). We assume the LLM outputted the generic chat response here.
            return AgentFinish({"output": text}, text)

def _build_executor(
    user_id: int, session_id: str, db: Session,
    return_intermediate_steps: bool = False
) -> AgentExecutor:
    memory = conversation_manager.get_memory(user_id, session_id, db)
    prefs_text = format_preferences_for_agent(load_user_preferences(user_id, db))
    bound_prompt = AGENT_PROMPT.partial(user_preferences=prefs_text)
    
    agent = create_react_agent(llm=llm, tools=tools, prompt=bound_prompt, output_parser=TolerantReActParser())
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
    user_id: int, message: str, session_id: str, db: Session
) -> tuple[str, list[dict]]:
    executor = _build_executor(user_id, session_id, db, return_intermediate_steps=True)
    result = await executor.ainvoke({"input": message})
    recommendations: list[dict] = []
    for action, observation in result.get("intermediate_steps", []):
        if getattr(action, "tool", "") == "search_restaurants":
            recommendations.extend(_parse_restaurant_lines(str(observation)))
    recommendations = _dedupe_recommendations(recommendations)[:5]
    ai_response = _finalize_response(str(result.get("output", "")), recommendations)
    conversation_manager.save_turn(user_id, session_id, message, ai_response, db)
    return ai_response, recommendations


async def chat_stream(
    user_id: int, message: str, session_id: str, db: Session
) -> AsyncGenerator[dict, None]:
    executor = _build_executor(user_id, session_id, db)
    collected_restaurants: list[dict] = []
    buffered_text = ""
    is_final_answer_streaming = False
    try:
        async for event in executor.astream_events({"input": message}, version="v2"):
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
                marker_matches = list(_FINAL_ANSWER_LINE_PATTERN.finditer(buffered_text))
                if not marker_matches:
                    # Avoid unbounded growth while waiting for final-answer marker.
                    if len(buffered_text) > 4000:
                        buffered_text = buffered_text[-4000:]
                    continue

                is_final_answer_streaming = True
                marker_end = marker_matches[-1].end()
                final_start = buffered_text[marker_end:].lstrip()
                if final_start:
                    yield {"type": "token", "content": final_start}
            elif kind == "on_tool_start":
                yield {"type": "tool_call", "tool": name, "input": str(event["data"].get("input", ""))}
            elif kind == "on_tool_end" and name == "search_restaurants":
                raw = str(event["data"].get("output", ""))
                restaurants = _parse_restaurant_lines(raw)
                collected_restaurants.extend(restaurants)
                if restaurants:
                    yield {"type": "tool_result", "restaurants": restaurants}
            elif kind == "on_chain_end" and name == "AgentExecutor":
                output = event["data"].get("output", {})
                unique_recommendations = _dedupe_recommendations(collected_restaurants)[:5]
                final_response = _finalize_response(
                    str(output.get("output", "")),
                    unique_recommendations,
                )
                conversation_manager.save_turn(
                    user_id, session_id, message, final_response, db
                )
                yield {
                    "type": "done",
                    "response": final_response,
                    "recommendations": unique_recommendations,
                    "session_id": session_id,
                }
    except Exception as exc:
        yield {"type": "error", "detail": str(exc)}