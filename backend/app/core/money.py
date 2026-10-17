"""Money as integer minor units plus an ISO 4217 currency (backend.md §3.1). Never floats."""

from collections.abc import Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal
from typing import Self

SUPPORTED_CURRENCIES = frozenset({"USD", "EUR"})
BASIS_POINTS = 10_000


class CurrencyMismatchError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class Money:
    amount_minor: int
    currency: str

    def __post_init__(self) -> None:
        if not isinstance(self.amount_minor, int) or isinstance(self.amount_minor, bool):
            raise TypeError("amount_minor must be an int (minor units, e.g. cents)")
        if self.currency not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {self.currency!r}")

    @classmethod
    def zero(cls, currency: str) -> Self:
        return cls(0, currency)

    def _same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            raise CurrencyMismatchError(f"{self.currency} vs {other.currency}")

    def __add__(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.amount_minor + other.amount_minor, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.amount_minor - other.amount_minor, self.currency)

    def __neg__(self) -> "Money":
        return Money(-self.amount_minor, self.currency)

    def multiply(self, factor: int) -> "Money":
        return Money(self.amount_minor * factor, self.currency)

    def percentage(self, basis_points: int, rounding: str = ROUND_HALF_EVEN) -> "Money":
        """basis_points / 10_000 of this amount, rounded to a whole minor unit."""
        exact = Decimal(self.amount_minor) * basis_points / BASIS_POINTS
        return Money(int(exact.quantize(Decimal(1), rounding=rounding)), self.currency)

    def allocate(self, ratios: Sequence[int]) -> list["Money"]:
        """Split into parts proportional to `ratios` without losing a single minor unit
        (largest-remainder method: leftover units go to the largest fractional parts)."""
        if not ratios or any(ratio < 0 for ratio in ratios) or sum(ratios) == 0:
            raise ValueError("ratios must be non-negative with a positive sum")
        sign = -1 if self.amount_minor < 0 else 1
        amount, total = abs(self.amount_minor), sum(ratios)
        shares = [amount * ratio // total for ratio in ratios]
        remainders = [amount * ratio % total for ratio in ratios]
        leftover = amount - sum(shares)
        for index in sorted(range(len(ratios)), key=lambda i: -remainders[i])[:leftover]:
            shares[index] += 1
        return [Money(sign * share, self.currency) for share in shares]
