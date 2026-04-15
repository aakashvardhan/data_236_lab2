"""Tests to verify Tavily search works and can be used by the AI assistant."""

import os
import pytest

from dotenv import load_dotenv

load_dotenv(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"),
    override=False,
)

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
SKIP_REASON = "TAVILY_API_KEY not set — skipping live API test"


# ---------------------------------------------------------------------------
# 1. Direct Tavily API connectivity
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not TAVILY_API_KEY, reason=SKIP_REASON)
def test_tavily_api_returns_results():
    """Verify the Tavily API key is valid and returns search results."""
    from tavily import TavilyClient

    client = TavilyClient(api_key=TAVILY_API_KEY)
    response = client.search("romantic restaurants in Dubai", max_results=3)

    assert "results" in response, "Tavily response missing 'results' key"
    assert len(response["results"]) > 0, "Tavily returned zero results"
    for result in response["results"]:
        assert "url" in result, "Each result should contain a 'url'"
        assert "content" in result, "Each result should contain 'content'"


# ---------------------------------------------------------------------------
# 2. Tavily returns relevant content for location-specific queries
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not TAVILY_API_KEY, reason=SKIP_REASON)
def test_tavily_returns_dubai_specific_results():
    """Verify Tavily returns results relevant to Dubai, not generic/local DB results."""
    from tavily import TavilyClient

    client = TavilyClient(api_key=TAVILY_API_KEY)
    response = client.search("romantic restaurants in Dubai", max_results=5)

    results = response.get("results", [])
    assert len(results) > 0, "No results returned for Dubai query"

    has_dubai_mention = any(
        "dubai" in (r.get("content", "") + r.get("url", "")).lower()
        for r in results
    )
    assert has_dubai_mention, (
        "None of the Tavily results mention 'Dubai'. "
        f"Got URLs: {[r.get('url') for r in results]}"
    )


# ---------------------------------------------------------------------------
# 3. Tavily LangChain tool works end-to-end
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not TAVILY_API_KEY, reason=SKIP_REASON)
@pytest.mark.asyncio
async def test_tavily_langchain_tool_invocation():
    """Verify the LangChain TavilySearchResults tool returns results."""
    from langchain_community.tools.tavily_search import TavilySearchResults

    tavily_tool = TavilySearchResults(
        max_results=3,
        tavily_api_key=TAVILY_API_KEY,
    )

    results = await tavily_tool.ainvoke("trending restaurants in Dubai tonight")
    assert results is not None, "TavilySearchResults returned None"
    assert len(results) > 0, "TavilySearchResults returned empty list"


# ---------------------------------------------------------------------------
# 4. Tavily handles edge cases gracefully
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not TAVILY_API_KEY, reason=SKIP_REASON)
def test_tavily_handles_vague_query():
    """Verify Tavily doesn't crash on a vague query."""
    from tavily import TavilyClient

    client = TavilyClient(api_key=TAVILY_API_KEY)
    response = client.search("restaurants", max_results=2)

    assert "results" in response
    assert isinstance(response["results"], list)


@pytest.mark.skipif(not TAVILY_API_KEY, reason=SKIP_REASON)
def test_tavily_handles_realtime_query():
    """Verify Tavily returns results for time-sensitive queries."""
    from tavily import TavilyClient

    client = TavilyClient(api_key=TAVILY_API_KEY)
    response = client.search("restaurants open now in San Jose", max_results=3)

    assert "results" in response
    assert len(response["results"]) > 0, "Tavily returned no results for real-time query"
