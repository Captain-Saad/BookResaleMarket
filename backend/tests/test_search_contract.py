import pytest
from pydantic import ValidationError

from app.modules.listings.schemas import (
    ListingSearchQuery,
    PublicListingDetail,
    PublicListingSummary,
    PublicLocation,
)


def test_public_contract_has_no_private_seller_fields() -> None:
    forbidden = {
        "seller_id",
        "address_id",
        "recipient_name",
        "line1",
        "line2",
        "postal_code",
        "upload_token_hash",
        "upload_expires_at",
        "purchase_locked",
        "version",
    }
    assert not forbidden.intersection(PublicListingSummary.model_fields)
    assert not forbidden.intersection(PublicListingDetail.model_fields)
    assert set(PublicLocation.model_fields) == {"city", "region", "country"}


def test_search_contract_accepts_empty_search_and_combined_filters() -> None:
    assert ListingSearchQuery().limit == 24
    query = ListingSearchQuery(
        q="book",
        condition="good",
        fulfillment="on_demand",
        currency="USD",
        min_price=0,
        max_price=1200,
    )
    assert query.model_dump(by_alias=True)["min_price"] == 0
    assert query.max_price == 1200


@pytest.mark.parametrize(
    "values",
    [
        {"min_price": 1},
        {"currency": "USD", "min_price": 200, "max_price": 100},
        {"limit": 101},
        {"limit": 0},
        {"q": "x" * 201},
        {"cursor": "x" * 501},
        {"condition": "perfect"},
        {"currency": "USD", "min_price": -1},
    ],
)
def test_search_contract_rejects_invalid_filters(values: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        ListingSearchQuery.model_validate(values)
