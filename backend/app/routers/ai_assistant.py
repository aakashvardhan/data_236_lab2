import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
from database import get_db
from utils.security import get_current_user
from models import User
from services.ai_assistant import chat, chat_stream
from services.conversation_manager import conversation_manager

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


# ------ Schemas -----


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class RestaurantRecommendation(BaseModel):
    id: int | None = None
    name: str | None = None
    rating: float | None = None
    pricing_tier: str | None = None
    cuisines: str | None = None


class ChatResponse(BaseModel):
    response: str
    recommendations: list[RestaurantRecommendation] = []
    session_id: str


# ------ Endpoints -----


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        response_text, recommendations = await chat(
            user_id=current_user.id,
            message=req.message,
            session_id=req.session_id,
            db=db,
        )
        return ChatResponse(
            response=response_text,
            recommendations=[RestaurantRecommendation(**r) for r in recommendations],
            session_id=req.session_id,
        )
    except Exception as exc:
        error_str = str(exc)
        if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
            return ChatResponse(
                response="⚠️ AI quota limit reached for today. The search above still works! Try again tomorrow or use a new API key.",
                recommendations=[],
                session_id=req.session_id,
            )
        raise HTTPException(status_code=500, detail=f"AI Assistant error: {exc}")
    
    
@router.post("/chat/stream")
async def chat_stream_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream the agent response as Server-Sent Events.

    Each event is a JSON object with a ``type`` field:
    - ``token``       – incremental text chunk for rendering word-by-word
    - ``tool_call``   – a tool is being invoked (show a loading indicator)
    - ``tool_result`` – structured restaurant cards from search_restaurants
    - ``done``        – final response + recommendations + session_id
    - ``error``       – error detail
    """

    async def event_generator():
        async for event_data in chat_stream(
            user_id=current_user.id,
            message=req.message,
            session_id=req.session_id,
            db=db,
        ):
            yield {"data": json.dumps(event_data)}

    return EventSourceResponse(event_generator())


@router.get("/chat/history")
async def get_chat_history(
    session_id: str = "default",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all messages for a given session."""
    history = conversation_manager.get_history(int(current_user.id), session_id, db)
    return {"history": history, "session_id": session_id}


@router.post("/chat/clear")
async def clear_chat(
    session_id: str = "default",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all messages for a session and evict in-memory cache."""
    cleared = conversation_manager.clear(int(current_user.id), session_id, db)
    return {
        "message": "Conversation cleared." if cleared else "No active conversation."
    }


@router.get("/sessions")
async def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    sessions = conversation_manager.list_sessions(int(current_user.id), db)
    return {"sessions": sessions}
