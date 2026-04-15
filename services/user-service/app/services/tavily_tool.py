from langchain_community.tools.tavily_search import TavilySearchResults

from app.config import get_settings

_settings = get_settings()

tavily_search = TavilySearchResults(
    max_results=3,
    tavily_api_key=_settings.TAVILY_API_KEY,
    description=(
        "Search the web for current restaurant info like hours, "
        "special events, trending spots, or recent reviews. "
        "Use when the user asks about 'tonight', 'open now', "
        "'trending', or anything requiring real-time data."
    ),
)
