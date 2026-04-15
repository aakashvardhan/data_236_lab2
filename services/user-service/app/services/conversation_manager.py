from datetime import datetime, timedelta

from langchain_classic.memory import ConversationBufferWindowMemory

from app.database import get_db


class ConversationManager:
    def __init__(self, max_turns: int = 10, expire_minutes: int = 30):
        self.max_turns = max_turns
        self.expire_minutes = expire_minutes
        self._store: dict[str, dict] = {}

    def _make_key(self, user_id: str, session_id: str) -> str:
        return f"{user_id}_{session_id}"

    async def get_memory(
        self, user_id: str, session_id: str, db=None
    ) -> ConversationBufferWindowMemory:
        mongo = db or get_db()
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
                await mongo.conversation_messages.find(
                    {"user_id": user_id, "session_id": session_id}
                )
                .sort("created_at", 1)
                .limit(self.max_turns * 2)
                .to_list(length=self.max_turns * 2)
            )

            for i in range(0, len(messages) - 1, 2):
                if (
                    messages[i]["role"] == "user"
                    and messages[i + 1]["role"] == "assistant"
                ):
                    memory.save_context(
                        {"input": messages[i]["content"]},
                        {"output": messages[i + 1]["content"]},
                    )

            self._store[key] = {
                "memory": memory,
                "last_active": datetime.now(),
            }

        self._store[key]["last_active"] = datetime.now()
        return self._store[key]["memory"]

    async def save_turn(
        self,
        user_id: str,
        session_id: str,
        user_msg: str,
        ai_msg: str,
        db=None,
    ):
        mongo = db or get_db()
        now = datetime.now()
        await mongo.conversation_messages.insert_many(
            [
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "role": "user",
                    "content": user_msg,
                    "created_at": now,
                },
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": ai_msg,
                    "created_at": now,
                },
            ]
        )

    async def clear(self, user_id: str, session_id: str, db=None) -> bool:
        mongo = db or get_db()
        key = self._make_key(user_id, session_id)
        if key in self._store:
            del self._store[key]

        result = await mongo.conversation_messages.delete_many(
            {"user_id": user_id, "session_id": session_id}
        )
        return result.deleted_count > 0

    async def get_history(
        self, user_id: str, session_id: str, db=None
    ) -> list[dict]:
        mongo = db or get_db()
        messages = (
            await mongo.conversation_messages.find(
                {"user_id": user_id, "session_id": session_id}
            )
            .sort("created_at", 1)
            .to_list(length=1000)
        )
        return [{"role": m["role"], "content": m["content"]} for m in messages]

    async def list_sessions(self, user_id: str, db=None) -> list[dict]:
        """Return all sessions for a user, ordered by most recently active."""
        mongo = db or get_db()
        pipeline = [
            {"$match": {"user_id": user_id}},
            {
                "$group": {
                    "_id": "$session_id",
                    "message_count": {"$sum": 1},
                    "last_active": {"$max": "$created_at"},
                }
            },
            {"$sort": {"last_active": -1}},
            {
                "$project": {
                    "_id": 0,
                    "session_id": "$_id",
                    "message_count": 1,
                    "last_active": 1,
                }
            },
        ]
        cursor = mongo.conversation_messages.aggregate(pipeline)
        return await cursor.to_list(length=100)


conversation_manager = ConversationManager(max_turns=10, expire_minutes=30)
