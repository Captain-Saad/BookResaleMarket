"""Structured logging: one JSON object per log line, carrying request-scoped context."""

import logging

import structlog
from structlog.typing import Processor


class UploadTokenFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple) and len(record.args) == 5:
            path = record.args[2]
            if isinstance(path, str) and path.startswith("/api/v1/dev/listing-uploads/"):
                record.args = (*record.args[:2], path.partition("?")[0], *record.args[3:])
        return True


def configure_logging(level: str, json_output: bool) -> None:
    access = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, UploadTokenFilter) for item in access.filters):
        access.addFilter(UploadTokenFilter())
    renderer: Processor = (
        structlog.processors.JSONRenderer() if json_output else structlog.dev.ConsoleRenderer()
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelNamesMapping()[level]),
        cache_logger_on_first_use=True,
    )
