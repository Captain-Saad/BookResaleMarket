import pytest
from pydantic import ValidationError

from app.modules.listings.schemas import ListingDraftRequest, ListingPatchRequest


def test_drafts_allow_incomplete_work_but_reject_invalid_money() -> None:
    assert ListingDraftRequest().price_minor is None
    for price in [0, -1, 1.5, True]:
        with pytest.raises(ValidationError):
            ListingDraftRequest.model_validate({"priceMinor": price})


def test_patch_preserves_omitted_fields_and_rejects_null_identity() -> None:
    patch = ListingPatchRequest.model_validate({"version": 1, "notes": ""})
    assert patch.model_dump(exclude_unset=True) == {"version": 1, "notes": ""}
    with pytest.raises(ValidationError):
        ListingPatchRequest.model_validate({"version": 1, "condition": None})
