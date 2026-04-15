import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("user_service")


class GlobalErrorHandler(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except ValueError as e:
            logger.warning(f"Validation error: {e}")
            return JSONResponse(
                status_code=400,
                content={"detail": str(e), "type": "validation_error"},
            )
        except PermissionError as e:
            logger.warning(f"Auth error: {e}")
            return JSONResponse(
                status_code=403,
                content={"detail": str(e), "type": "forbidden"},
            )
        except Exception as e:
            logger.error(f"Unhandled error: {e}\n{traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "type": "server_error"},
            )
