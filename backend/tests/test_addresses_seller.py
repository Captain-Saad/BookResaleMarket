from collections.abc import Callable
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.errors import ForbiddenError
from app.modules.identity import service
from app.modules.identity.models import SellerVerificationStatus

ADDRESS = {
    "recipientName": "Ada Reader",
    "line1": "1 Main St",
    "line2": "",
    "city": "Lahore",
    "region": "Punjab",
    "postalCode": "54000",
    "country": "pk",
}


def create_address(api: TestClient) -> dict[str, str]:
    response = api.post("/api/v1/me/addresses", json=ADDRESS)
    assert response.status_code == 201
    body: dict[str, str] = response.json()
    return body


def test_addresses_need_a_session(api: TestClient) -> None:
    assert api.get("/api/v1/me/addresses").status_code == 401
    assert api.post("/api/v1/me/addresses", json=ADDRESS).status_code == 401


def test_create_list_update_and_delete(api: TestClient, sign_in: Callable[[str], None]) -> None:
    sign_in("reader@example.com")
    assert api.get("/api/v1/me/addresses").json() == []

    created = create_address(api)
    assert created["country"] == "PK"
    assert created["line2"] is None
    assert api.get("/api/v1/me/addresses").json() == [created]

    updated = api.patch(f"/api/v1/me/addresses/{created['id']}", json={**ADDRESS, "city": "Multan"})
    assert updated.status_code == 200
    assert updated.json()["city"] == "Multan"

    assert api.delete(f"/api/v1/me/addresses/{created['id']}").status_code == 204
    assert api.get("/api/v1/me/addresses").json() == []


def test_another_users_address_looks_like_it_does_not_exist(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("owner@example.com")
    address = create_address(api)
    sign_in("other@example.com")

    assert api.get("/api/v1/me/addresses").json() == []
    url = f"/api/v1/me/addresses/{address['id']}"
    other_user = api.patch(url, json=ADDRESS)
    missing = api.patch(f"/api/v1/me/addresses/{uuid4()}", json=ADDRESS)
    assert other_user.status_code == missing.status_code == 404
    assert other_user.json()["code"] == missing.json()["code"] == "not_found"
    assert api.delete(url).status_code == 404

    sign_in("owner@example.com")
    assert api.get("/api/v1/me/addresses").json()[0]["city"] == "Lahore"


@pytest.mark.parametrize(
    "change",
    [{"country": "Pakistan"}, {"country": "P1"}, {"city": "  "}, {"postalCode": "x" * 21}],
)
def test_invalid_addresses_are_rejected(
    api: TestClient, sign_in: Callable[[str], None], change: dict[str, str]
) -> None:
    sign_in("reader@example.com")
    assert api.post("/api/v1/me/addresses", json={**ADDRESS, **change}).status_code == 422


def test_an_address_cannot_be_assigned_to_someone_else(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    body = {**ADDRESS, "userId": str(uuid4()), "id": str(uuid4())}
    created = api.post("/api/v1/me/addresses", json=body).json()
    assert created["id"] != body["id"]
    assert len(api.get("/api/v1/me/addresses").json()) == 1


def test_one_account_can_be_buyer_and_seller(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    assert api.get("/api/v1/me").json()["roles"] == ["buyer"]
    response = api.post("/api/v1/me/roles/seller")
    assert response.status_code == 200
    assert response.json()["roles"] == ["buyer", "seller"]
    assert api.post("/api/v1/me/roles/seller").json()["roles"] == ["buyer", "seller"]


def test_verification_needs_the_seller_role(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    response = api.post("/api/v1/me/seller-verification")
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"


def test_starting_verification_marks_it_pending(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    api.post("/api/v1/me/roles/seller")
    assert api.get("/api/v1/me").json()["sellerVerification"] == "not_started"
    response = api.post("/api/v1/me/seller-verification")
    assert response.status_code == 200
    assert response.json()["sellerVerification"] == "pending"


@pytest.mark.parametrize(
    ("current", "after"),
    [("pending", "pending"), ("verified", "verified"), ("rejected", "pending")],
)
def test_restarting_verification_only_applies_after_a_rejection(
    api: TestClient,
    sign_in: Callable[[str], None],
    set_verification: Callable[[str, str], None],
    current: str,
    after: str,
) -> None:
    sign_in("reader@example.com")
    api.post("/api/v1/me/roles/seller")
    api.post("/api/v1/me/seller-verification")
    set_verification("reader@example.com", current)
    response = api.post("/api/v1/me/seller-verification")
    assert response.json()["sellerVerification"] == after


def test_a_user_cannot_verify_themselves_through_the_api(
    api: TestClient, sign_in: Callable[[str], None]
) -> None:
    sign_in("reader@example.com")
    api.post("/api/v1/me/roles/seller")
    response = api.post(
        "/api/v1/me/seller-verification",
        json={"status": "verified", "sellerVerification": "verified"},
    )
    assert response.json()["sellerVerification"] == "pending"
    patched = api.patch("/api/v1/me", json={"displayName": "Ada", "sellerVerification": "verified"})
    assert patched.json()["sellerVerification"] == "pending"


@pytest.mark.parametrize(
    ("status", "allowed"),
    [
        (SellerVerificationStatus.NOT_STARTED, False),
        (SellerVerificationStatus.PENDING, False),
        (SellerVerificationStatus.REJECTED, False),
        (SellerVerificationStatus.VERIFIED, True),
    ],
)
def test_only_verified_sellers_can_make_listings_purchasable(
    status: SellerVerificationStatus, allowed: bool
) -> None:
    if allowed:
        service.require_verified_seller(status)
    else:
        with pytest.raises(ForbiddenError) as raised:
            service.require_verified_seller(status)
        assert raised.value.code == "seller_not_verified"
