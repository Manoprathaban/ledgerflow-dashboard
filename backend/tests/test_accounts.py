def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_accounts_placeholder_route(client):
    response = client.get("/api/v1/accounts")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
