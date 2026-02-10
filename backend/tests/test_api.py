from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers() -> dict[str, str]:
    login = client.post(
        '/api/auth/login',
        json={'username': 'user0001', 'password': 'Password@123'},
    )
    assert login.status_code == 200
    token = login.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def test_health():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_user_seed_count():
    response = client.get('/api/auth/stats')
    assert response.status_code == 200
    assert response.json()['users'] >= 1000


def test_requires_auth_for_tools():
    response = client.get('/api/tools')
    assert response.status_code == 401


def test_login_and_tools_flow():
    headers = auth_headers()
    response = client.get('/api/tools', headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 3


def test_integrate_tool_success():
    headers = auth_headers()
    response = client.post(
        '/api/integrate-tool',
        headers=headers,
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
    headers = auth_headers()
    response = client.post(
        '/api/exit-readiness',
        headers=headers,
        json={
            'burnout_level': 9,
            'growth_score': 3,
            'mission_alignment': 2,
        },
    )
    assert response.status_code == 200
    assert 'recommendation' in response.json()
