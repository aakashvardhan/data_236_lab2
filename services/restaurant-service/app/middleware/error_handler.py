import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("restaurant_service")


class GlobalErrorHandler(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except ValueError as exc:
            logger.warning("Validation error: %s", exc)
            return JSONResponse(
                status_code=400,
                content={"detail": str(exc), "type": "validation_error"},
            )
        except PermissionError as exc:
            logger.warning("Auth error: %s", exc)
            return JSONResponse(
                status_code=403,
                content={"detail": str(exc), "type": "forbidden"},
            )
        except Exception as exc:
            logger.error(
                "Unhandled error: %s\n%s", exc, traceback.format_exc()
            )
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "type": "server_error",
                },
            )
