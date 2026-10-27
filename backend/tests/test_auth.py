from uuid import UUID

import httpx
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import Settings
from app.main import app
from app.security import auth
from app.security.auth import get_current_user


def test_missing_bearer_credentials_are_rejected():
    with pytest.raises(HTTPException) as error:
        get_current_user(None)

    assert error.value.status_code == 401


def test_account_api_requires_a_bearer_token(client):
    current_user_override = app.dependency_overrides.pop(get_current_user)
    try:
        response = client.get("/api/v1/accounts")
    finally:
        app.dependency_overrides[get_current_user] = current_user_override

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


def test_supabase_identity_is_used_as_authenticated_user(monkeypatch):
    user_id = UUID("00000000-0000-4000-8000-000000000001")
    monkeypatch.setattr(
        auth,
        "get_settings",
        lambda: Settings(
            supabase_url="https://project.supabase.co",
            supabase_anon_key="public-key",
        ),
    )
    request_args: dict[str, object] = {}

    def fake_get(url, *, headers, timeout):
        request_args.update(url=url, headers=headers, timeout=timeout)
        return httpx.Response(200, json={"id": str(user_id)})

    monkeypatch.setattr(auth.httpx, "get", fake_get)

    user = get_current_user(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials="verified-token")
    )

    assert user.id == user_id
    assert request_args["url"] == "https://project.supabase.co/auth/v1/user"
    assert request_args["headers"] == {
        "apikey": "public-key",
        "Authorization": "Bearer verified-token",
    }


def test_supabase_rejects_invalid_access_token(monkeypatch):
    monkeypatch.setattr(
        auth,
        "get_settings",
        lambda: Settings(
            supabase_url="https://project.supabase.co",
            supabase_anon_key="public-key",
        ),
    )
    monkeypatch.setattr(
        auth.httpx,
        "get",
        lambda *args, **kwargs: httpx.Response(401, json={"message": "invalid token"}),
    )

    with pytest.raises(HTTPException) as error:
        get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token"))

    assert error.value.status_code == 401
