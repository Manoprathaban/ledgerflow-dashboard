def test_transactions_placeholder_route(client):
    response = client.get("/api/v1/transactions")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
