from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_tools_exist():
    response = client.get('/api/tools')
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


def test_integrate_tool_success():
    response = client.post(
        '/api/integrate-tool',
        json={
            'tool_name': 'LLM Assistant',
            'use_case': 'Help product and engineering draft launch docs.',
            'team_size': 12,
            'risk_tolerance': 'medium',
        },
    )
    assert response.status_code == 200
    assert response.json()['tool'] == 'LLM Assistant'


def test_exit_readiness_path():
    response = client.post(
        '/api/exit-readiness',
        json={
            'burnout_level': 9,
            'growth_score': 3,
            'mission_alignment': 2,
        },
    )
    assert response.status_code == 200
    assert 'recommendation' in response.json()
