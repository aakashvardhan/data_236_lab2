from typing import AsyncGenerator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_classic.agents import AgentExecutor, create_react_agent
from sqlalchemy.orm import Session
from config import get_settings
from services.ai_tools import search_restaurants
from services.conversation_manager import conversation_manager
from services.preferences_loader import load_user_preferences, format_preferences_for_agent
from services.tavily_tool import tavily_search

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

Use this format:
Question: the user's question
Thought: think about what to do
Action: the tool to use (one of [{tool_names}])
Action Input: the input to the tool
Observation: the tool's result
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: your recommendation to the user.

Chat History:
{chat_history}

Question: {input}
{agent_scratchpad}""")


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
        max_iterations=6,
        max_execution_time=60,
        return_intermediate_steps=return_intermediate_steps,
    )


async def chat(
    user_id: int, message: str, session_id: str, db: Session
) -> tuple[str, list[dict]]:
    executor = _build_executor(user_id, session_id, db, return_intermediate_steps=True)
    result = await executor.ainvoke({"input": message})
    ai_response = result["output"]
    recommendations: list[dict] = []
    for action, observation in result.get("intermediate_steps", []):
        if getattr(action, "tool", "") == "search_restaurants":
            recommendations.extend(_parse_restaurant_lines(str(observation)))
    conversation_manager.save_turn(user_id, session_id, message, ai_response, db)
    return ai_response, recommendations[:5]


async def chat_stream(
    user_id: int, message: str, session_id: str, db: Session
) -> AsyncGenerator[dict, None]:
    executor = _build_executor(user_id, session_id, db)
    collected_restaurants: list[dict] = []
    try:
        async for event in executor.astream_events({"input": message}, version="v2"):
            kind: str = event["event"]
            name: str = event.get("name", "")
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                token = chunk.content if hasattr(chunk, "content") else ""
                if isinstance(token, list):
                    token = "".join(b.get("text", "") for b in token if b.get("type") == "text")
                elif not isinstance(token, str):
                    token = str(token)
                if token:
                    yield {"type": "token", "content": token}
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
                final_response = output.get("output", "")
                conversation_manager.save_turn(
                    user_id, session_id, message, final_response, db
                )
                yield {
                    "type": "done",
                    "response": final_response,
                    "recommendations": collected_restaurants[:5],
                    "session_id": session_id,
                }
    except Exception as exc:
        yield {"type": "error", "detail": str(exc)}