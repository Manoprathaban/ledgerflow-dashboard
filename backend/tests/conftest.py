from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security.auth import AuthenticatedUser, get_current_user

TEST_USER_ID = "00000000-0000-4000-8000-000000000001"


@pytest.fixture(scope="module")
def client() -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id=UUID(TEST_USER_ID))
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_current_user, None)
