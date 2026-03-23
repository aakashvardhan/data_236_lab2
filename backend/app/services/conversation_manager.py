from langchain_classic.memory import ConversationBufferWindowMemory
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models import ConversationMessage


class ConversationManager:
    def __init__(self, max_turns: int = 10, expire_minutes: int = 30):
        self.max_turns = max_turns
        self.expire_minutes = expire_minutes
        self._store: dict[str, dict] = {}

    def _make_key(self, user_id: int, session_id: str) -> str:
        return f"{user_id}_{session_id}"

    def get_memory(
        self, user_id: int, session_id: str, db: Session
    ) -> ConversationBufferWindowMemory:
        key = self._make_key(user_id, session_id)

        if key in self._store:
            last_active = self._store[key]["last_active"]
            if datetime.now() - last_active > timedelta(minutes=self.expire_minutes):
                del self._store[key]

        if key not in self._store:
            memory = ConversationBufferWindowMemory(
                memory_key="chat_history",
                return_messages=False,
                k=self.max_turns,
            )

            messages = (
                db.query(ConversationMessage)
                .filter(
                    ConversationMessage.user_id == user_id,
                    ConversationMessage.session_id == session_id,
                )
                .order_by(ConversationMessage.created_at.asc())
                .limit(self.max_turns * 2)
                .all()
            )
            for i in range(0, len(messages) - 1, 2):
                if messages[i].role == "user" and messages[i + 1].role == "assistant":
                    memory.save_context(
                        {"input": messages[i].content},
                        {"output": messages[i + 1].content},
                    )

            self._store[key] = {
                "memory": memory,
                "last_active": datetime.now(),
            }

        self._store[key]["last_active"] = datetime.now()
        return self._store[key]["memory"]

    def save_turn(
        self, user_id: int, session_id: str, user_msg: str, ai_msg: str, db: Session
    ):
        db.add(
            ConversationMessage(
                user_id=user_id,
                session_id=session_id,
                role="user",
                content=user_msg,
            )
        )
        db.add(
            ConversationMessage(
                user_id=user_id,
                session_id=session_id,
                role="assistant",
                content=ai_msg,
            )
        )
        db.commit()

    def clear(self, user_id: int, session_id: str, db: Session) -> bool:
        key = self._make_key(user_id, session_id)
        if key in self._store:
            del self._store[key]

        deleted = (
            db.query(ConversationMessage)
            .filter(
                ConversationMessage.user_id == user_id,
                ConversationMessage.session_id == session_id,
            )
            .delete()
        )
        db.commit()
        return deleted > 0

    def get_history(self, user_id: int, session_id: str, db: Session) -> list[dict]:
        messages = (
            db.query(ConversationMessage)
            .filter(
                ConversationMessage.user_id == user_id,
                ConversationMessage.session_id == session_id,
            )
            .order_by(ConversationMessage.created_at.asc())
            .all()
        )
        return [{"role": m.role, "content": m.content} for m in messages]

    def list_sessions(self, user_id: int, db: Session) -> list[dict]:
        """Return all sessions for a user, ordered by most recently active."""
        rows = (
            db.query(
                ConversationMessage.session_id,
                func.count(ConversationMessage.id).label("message_count"),
                func.max(ConversationMessage.created_at).label("last_active"),
            )
            .filter(ConversationMessage.user_id == user_id)
            .group_by(ConversationMessage.session_id)
            .order_by(func.max(ConversationMessage.created_at).desc())
            .all()
        )
        return [
            {
                "session_id": row.session_id,
                "message_count": row.message_count,
                "last_active": row.last_active,
            }
            for row in rows
        ]


conversation_manager = ConversationManager(max_turns=10, expire_minutes=30)
