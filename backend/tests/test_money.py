from decimal import ROUND_HALF_UP, Decimal

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.core.money import CurrencyMismatchError, Money

currencies = st.sampled_from(["USD", "EUR"])
amounts = st.integers(min_value=-(10**12), max_value=10**12)
ratio_lists = st.lists(st.integers(min_value=0, max_value=10_000), min_size=1, max_size=8).filter(
    lambda ratios: sum(ratios) > 0
)


@given(amounts, ratio_lists, currencies)
def test_allocation_never_creates_or_loses_minor_units(
    amount: int, ratios: list[int], currency: str
) -> None:
    parts = Money(amount, currency).allocate(ratios)
    assert len(parts) == len(ratios)
    assert sum(part.amount_minor for part in parts) == amount
    assert all(part.currency == currency for part in parts)


@given(amounts, ratio_lists)
def test_each_allocated_part_is_within_one_minor_unit_of_exact(
    amount: int, ratios: list[int]
) -> None:
    parts = Money(amount, "USD").allocate(ratios)
    for part, ratio in zip(parts, ratios, strict=True):
        exact = Decimal(amount) * ratio / sum(ratios)
        assert abs(Decimal(part.amount_minor) - exact) < 1


@given(amounts, amounts, currencies)
def test_addition_and_subtraction_are_inverse(a: int, b: int, currency: str) -> None:
    x, y = Money(a, currency), Money(b, currency)
    assert (x + y) - y == x
    assert x + y == y + x
    assert x + (-x) == Money.zero(currency)


@given(amounts, st.integers(min_value=0, max_value=10_000))
def test_percentage_is_within_half_a_minor_unit(amount: int, basis_points: int) -> None:
    result = Money(amount, "EUR").percentage(basis_points)
    exact = Decimal(amount) * basis_points / 10_000
    assert abs(Decimal(result.amount_minor) - exact) <= Decimal("0.5")


def test_percentage_rounding_is_explicit() -> None:
    assert Money(250, "USD").percentage(100).amount_minor == 2
    assert Money(250, "USD").percentage(100, rounding=ROUND_HALF_UP).amount_minor == 3


def test_allocation_example() -> None:
    assert [m.amount_minor for m in Money(100, "USD").allocate([1, 1, 1])] == [34, 33, 33]


def test_mixing_currencies_is_rejected() -> None:
    with pytest.raises(CurrencyMismatchError):
        Money(100, "USD") + Money(100, "EUR")


@pytest.mark.parametrize("amount", [1.5, "100", True])
def test_amount_must_be_an_integer(amount: object) -> None:
    with pytest.raises(TypeError):
        Money(amount, "USD")  # type: ignore[arg-type]


def test_unsupported_currency_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unsupported currency"):
        Money(100, "GBP")


def test_invalid_ratios_are_rejected() -> None:
    with pytest.raises(ValueError):
        Money(100, "USD").allocate([0, 0])
