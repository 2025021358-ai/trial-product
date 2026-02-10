import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from contextlib import closing
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="AI Career Compass API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "users.db"
TOKEN_SECRET = os.getenv("TOKEN_SECRET", "dev-token-secret-change-in-prod")
TOKEN_TTL_SECONDS = 60 * 60 * 8
DEFAULT_PASSWORD = "Password@123"

TOOLS = [
    {
        "id": "llm-assistant",
        "name": "LLM Assistant",
        "category": "Productivity",
        "best_for": "Content drafting, coding support, and brainstorming.",
        "integration": [
            "Define your top 3 repetitive workflows.",
            "Set prompt templates with guardrails and approval checks.",
            "Track quality metrics and iterate weekly.",
        ],
    },
    {
        "id": "rag-search",
        "name": "RAG Knowledge Search",
        "category": "Knowledge",
        "best_for": "Internal docs question answering and onboarding.",
        "integration": [
            "Index trusted internal docs.",
            "Add source citations in each answer.",
            "Run human-in-the-loop review for critical outputs.",
        ],
    },
    {
        "id": "workflow-agent",
        "name": "Workflow Agent",
        "category": "Automation",
        "best_for": "Ticket triage, CRM updates, and async operations.",
        "integration": [
            "Start with non-critical workflows.",
            "Use rollback + audit logs.",
            "Scale after 95%+ task accuracy.",
        ],
    },
]

LEARNING_PATH = [
    {"week": 1, "focus": "AI Foundations", "actions": ["Prompt basics", "Model limits", "Security fundamentals"]},
    {"week": 2, "focus": "Hands-on Integration", "actions": ["API orchestration", "Latency budgeting", "Observability"]},
    {"week": 3, "focus": "Production Readiness", "actions": ["Guardrails", "Evaluation suite", "Incident playbooks"]},
    {"week": 4, "focus": "Career Decision", "actions": ["Impact review", "Growth plan", "Exit/Stay decision framework"]},
]


class IntegrationRequest(BaseModel):
    tool_name: str = Field(min_length=2, max_length=80)
    use_case: str = Field(min_length=10, max_length=500)
    team_size: int = Field(ge=1, le=500)
    risk_tolerance: Literal["low", "medium", "high"]


class ExitReadinessRequest(BaseModel):
    burnout_level: int = Field(ge=1, le=10)
    growth_score: int = Field(ge=1, le=10)
    mission_alignment: int = Field(ge=1, le=10)


class LoginRequest(BaseModel):
    username: str = Field(min_length=4, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _hash_password(password: str, salt: str) -> str:
    raw = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return base64.b64encode(raw).decode("utf-8")


def _verify_password(password: str, salt: str, password_hash: str) -> bool:
    return hmac.compare_digest(_hash_password(password, salt), password_hash)


def _seed_users_if_empty() -> None:
    with closing(_connect()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL
            )
            """
        )
        row = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()
        if row["count"] >= 1000:
            conn.commit()
            return

        missing = 1000 - row["count"]
        for index in range(row["count"] + 1, row["count"] + missing + 1):
            username = f"user{index:04d}"
            salt = secrets.token_hex(16)
            password_hash = _hash_password(DEFAULT_PASSWORD, salt)
            conn.execute(
                "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                (username, password_hash, salt),
            )
        conn.commit()


def _create_token(username: str) -> str:
    payload = {"sub": username, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def _decode_token(token: str) -> str:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token format") from exc

    expected = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid token signature")

    padding = "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding).decode("utf-8"))
    if int(time.time()) > payload.get("exp", 0):
        raise HTTPException(status_code=401, detail="Token expired")
    return payload["sub"]


def get_current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    return _decode_token(token)


@app.on_event("startup")
def startup_event() -> None:
    _seed_users_if_empty()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/stats")
def auth_stats() -> dict[str, int]:
    _seed_users_if_empty()
    with closing(_connect()) as conn:
        row = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()
    return {"users": row["count"]}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    _seed_users_if_empty()
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT username, password_hash, salt FROM users WHERE username = ?",
            (payload.username.lower(),),
        ).fetchone()

    if not row or not _verify_password(payload.password, row["salt"], row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return LoginResponse(access_token=_create_token(row["username"]), username=row["username"])


@app.get("/api/tools")
def get_tools(_: str = Depends(get_current_user)) -> list[dict]:
    return TOOLS


@app.get("/api/learning-path")
def get_learning_path(_: str = Depends(get_current_user)) -> list[dict]:
    return LEARNING_PATH


@app.post("/api/integrate-tool")
def integrate_tool(payload: IntegrationRequest, _: str = Depends(get_current_user)) -> dict:
    matching_tool = next((tool for tool in TOOLS if tool["name"].lower() == payload.tool_name.lower()), None)
    if not matching_tool:
        raise HTTPException(status_code=404, detail="Tool not found. Choose one from /api/tools.")

    complexity = "Low"
    if payload.team_size > 20 or payload.risk_tolerance == "low":
        complexity = "Medium"
    if payload.team_size > 50 and payload.risk_tolerance == "low":
        complexity = "High"

    return {
        "tool": matching_tool["name"],
        "recommended_plan": matching_tool["integration"],
        "complexity": complexity,
        "notes": f"Use case: {payload.use_case}",
    }


@app.post("/api/exit-readiness")
def exit_readiness(payload: ExitReadinessRequest, _: str = Depends(get_current_user)) -> dict:
    weighted_score = round(
        (payload.growth_score * 0.45) + (payload.mission_alignment * 0.35) - (payload.burnout_level * 0.30),
        2,
    )

    if weighted_score >= 4.5:
        recommendation = "Stay and scale your AI ownership with a 90-day growth charter."
    elif weighted_score >= 2.5:
        recommendation = "Stabilize first: renegotiate scope, support, and mentorship before deciding."
    else:
        recommendation = "Plan an exit strategy with a skills portfolio and transition timeline."

    return {
        "score": weighted_score,
        "recommendation": recommendation,
        "next_steps": [
            "Document your wins with measurable impact.",
            "Review market opportunities aligned with your AI stack.",
            "Set a decision checkpoint in 30 days.",
        ],
    }
