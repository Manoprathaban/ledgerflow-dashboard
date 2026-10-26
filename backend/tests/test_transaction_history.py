def test_docs_route_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text
