import json

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.schemas import ChatRequest, ChatResponse, RestaurantRecommendation
from app.services.ai_assistant import chat, chat_stream
from app.services.conversation_manager import conversation_manager
from app.utils.security import get_current_user

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        response_text, recommendations = await chat(
            user_id=current_user["id"],
            message=req.message,
            session_id=req.session_id,
        )
        return ChatResponse(
            response=response_text,
            recommendations=[
                RestaurantRecommendation(**r) for r in recommendations
            ],
            session_id=req.session_id,
        )
    except Exception as exc:
        error_str = str(exc)
        if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
            return ChatResponse(
                response=(
                    "⚠️ AI quota limit reached for today. "
                    "The search above still works! "
                    "Try again tomorrow or use a new API key."
                ),
                recommendations=[],
                session_id=req.session_id,
            )
        raise HTTPException(
            status_code=500, detail="AI Assistant is temporarily unavailable. Please try again later."
        )


@router.post("/chat/stream")
async def chat_stream_endpoint(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream the agent response as Server-Sent Events.

    Each event is a JSON object with a ``type`` field:
    - ``token``       – incremental text chunk
    - ``tool_call``   – a tool is being invoked
    - ``tool_result`` – restaurant cards from search_restaurants
    - ``done``        – final response + recommendations + session_id
    - ``error``       – error detail
    """

    async def event_generator():
        async for event_data in chat_stream(
            user_id=current_user["id"],
            message=req.message,
            session_id=req.session_id,
        ):
            yield {"data": json.dumps(event_data)}

    return EventSourceResponse(event_generator())


@router.get("/chat/history")
async def get_chat_history(
    session_id: str = "default",
    current_user: dict = Depends(get_current_user),
):
    """Return all messages for a given session."""
    history = await conversation_manager.get_history(
        current_user["id"], session_id
    )
    return {"history": history, "session_id": session_id}


@router.post("/chat/clear")
async def clear_chat(
    session_id: str = "default",
    current_user: dict = Depends(get_current_user),
):
    """Delete all messages for a session and evict in-memory cache."""
    cleared = await conversation_manager.clear(current_user["id"], session_id)
    return {
        "message": "Conversation cleared." if cleared else "No active conversation."
    }


@router.get("/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """List all chat sessions for the current user."""
    sessions = await conversation_manager.list_sessions(current_user["id"])
    return {"sessions": sessions}
