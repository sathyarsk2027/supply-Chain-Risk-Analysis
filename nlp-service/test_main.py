from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_extract_endpoint_empty():
    response = client.post("/extract", json={"text": ""})
    assert response.status_code == 200
    data = response.json()
    assert data["companies"] == []
    assert data["locations"] == []
    assert data["dates"] == []
    assert data["category"] == "other"

def test_extract_endpoint_logistics():
    response = client.post("/extract", json={"text": "A severe truck driver strike delayed the shipping container freight deliveries at the local warehouse yesterday."})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "logistics"
    assert "yesterday" in data["dates"]

def test_extract_endpoint_geopolitical():
    response = client.post("/extract", json={"text": "The government announced new trade tariffs and sanctions against the foreign military force."})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "geopolitical"

def test_extract_endpoint_weather():
    response = client.post("/extract", json={"text": "A massive hurricane flood hit the coast on June 15th."})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "weather"
    assert "June 15th" in data["dates"]

def test_extract_entities():
    response = client.post("/extract", json={"text": "Apple Inc. announced delays at their assembly plant in Shenzhen, China on July 10, 2026."})
    assert response.status_code == 200
    data = response.json()
    assert "Apple Inc." in data["companies"]
    assert "Shenzhen" in data["locations"] or "China" in data["locations"]
    assert "July 10, 2026" in data["dates"]

def test_extract_endpoint_market():
    response = client.post("/extract", json={"text": "Apple Inc. (AAPL) stocks value increased after strong revenue report and merger rumors."})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "market"

def test_embed_endpoint():
    response = client.post("/embed", json={"text": "Hello world"})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert isinstance(data["embedding"], list)
    assert len(data["embedding"]) == 384
    assert all(isinstance(val, float) for val in data["embedding"])

def test_embed_endpoint_empty():
    response = client.post("/embed", json={"text": ""})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert len(data["embedding"]) == 384
    assert all(val == 0.0 for val in data["embedding"])

