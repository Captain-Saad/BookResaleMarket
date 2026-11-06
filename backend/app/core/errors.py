"""Problem details (RFC 9457, formerly 7807): every error response has the same JSON shape."""

from http import HTTPStatus
from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.status import HTTP_422_UNPROCESSABLE_CONTENT

from app.core.request_id import REQUEST_ID_HEADER

PROBLEM_JSON = "application/problem+json"

logger = structlog.get_logger("errors")


class ProblemDetails(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    code: str
    detail: str | None = None
    request_id: str | None = None
    errors: list[dict[str, Any]] | None = None


class AppError(Exception):
    status: int = HTTPStatus.INTERNAL_SERVER_ERROR
    code: str = "internal_error"

    def __init__(self, detail: str | None = None, *, code: str | None = None) -> None:
        super().__init__(detail or self.code)
        self.detail = detail
        if code is not None:
            self.code = code


class NotFoundError(AppError):
    status = HTTPStatus.NOT_FOUND
    code = "not_found"


class ConflictError(AppError):
    status = HTTPStatus.CONFLICT
    code = "conflict"


class UnauthorizedError(AppError):
    status = HTTPStatus.UNAUTHORIZED
    code = "not_authenticated"


class ForbiddenError(AppError):
    status = HTTPStatus.FORBIDDEN
    code = "forbidden"


class InvalidTokenError(AppError):
    status = HTTPStatus.BAD_REQUEST
    code = "invalid_token"


class InvalidCurrentPasswordError(AppError):
    status = HTTPStatus.BAD_REQUEST
    code = "invalid_current_password"


class RateLimitedError(AppError):
    status = HTTPStatus.TOO_MANY_REQUESTS
    code = "rate_limited"

    def __init__(self, retry_after: int) -> None:
        super().__init__()
        self.retry_after = retry_after


class ServiceUnavailableError(AppError):
    status = HTTPStatus.SERVICE_UNAVAILABLE
    code = "service_unavailable"


HTTP_ERROR_CODES = {404: "not_found", 405: "method_not_allowed", 413: "payload_too_large"}


def problem_response(
    request: Request,
    *,
    status: int,
    code: str,
    detail: str | None = None,
    errors: list[dict[str, Any]] | None = None,
) -> JSONResponse:
    request_id: str | None = getattr(request.state, "request_id", None)
    problem = ProblemDetails(
        title=HTTPStatus(status).phrase,
        status=status,
        code=code,
        detail=detail,
        request_id=request_id,
        errors=errors,
    )
    return JSONResponse(
        problem.model_dump(exclude_none=True),
        status_code=status,
        media_type=PROBLEM_JSON,
        headers={REQUEST_ID_HEADER: request_id} if request_id else None,
    )


async def _app_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppError):
        raise exc
    response = problem_response(request, status=exc.status, code=exc.code, detail=exc.detail)
    if isinstance(exc, RateLimitedError):
        response.headers["Retry-After"] = str(exc.retry_after)
    return response


async def _http_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):
        raise exc
    code = HTTP_ERROR_CODES.get(exc.status_code, "http_error")
    detail = None if exc.detail == HTTPStatus(exc.status_code).phrase else str(exc.detail)
    return problem_response(request, status=exc.status_code, code=code, detail=detail)


async def _validation_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise exc
    errors = [
        {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]
    return problem_response(
        request, status=HTTP_422_UNPROCESSABLE_CONTENT, code="validation_error", errors=errors
    )


async def _unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled error", request_id=getattr(request.state, "request_id", None), exc_info=exc
    )
    return problem_response(request, status=HTTPStatus.INTERNAL_SERVER_ERROR, code="internal_error")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(Exception, _unhandled_error)
