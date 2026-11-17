import re
from typing import Protocol

from app.core.errors import AppError
from app.modules.listings.schemas import BookMetadata


class InvalidIsbnError(AppError):
    status = 422
    code = "invalid_isbn"


def normalize_isbn(value: str) -> str:
    isbn = re.sub(r"[\s-]", "", value).upper()
    if re.fullmatch(r"[0-9]{9}[0-9X]", isbn):
        valid = (
            sum(
                (10 if digit == "X" else int(digit)) * (10 - index)
                for index, digit in enumerate(isbn)
            )
            % 11
            == 0
        )
    elif re.fullmatch(r"[0-9]{13}", isbn):
        valid = (
            sum(int(digit) * (3 if index % 2 else 1) for index, digit in enumerate(isbn)) % 10 == 0
        )
    else:
        valid = False
    if not valid:
        raise InvalidIsbnError()
    return isbn


class IsbnLookupProvider(Protocol):
    async def lookup(self, isbn: str) -> BookMetadata: ...
