from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title="AI Career Compass API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IntegrationRequest(BaseModel):
    tool_name: str = Field(min_length=2, max_length=80)
    use_case: str = Field(min_length=10, max_length=500)
    team_size: int = Field(ge=1, le=500)
    risk_tolerance: Literal["low", "medium", "high"]


class ExitReadinessRequest(BaseModel):
    burnout_level: int = Field(ge=1, le=10)
    growth_score: int = Field(ge=1, le=10)
    mission_alignment: int = Field(ge=1, le=10)


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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tools")
def get_tools() -> list[dict]:
    return TOOLS


@app.get("/api/learning-path")
def get_learning_path() -> list[dict]:
    return LEARNING_PATH


@app.post("/api/integrate-tool")
def integrate_tool(payload: IntegrationRequest) -> dict:
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
def exit_readiness(payload: ExitReadinessRequest) -> dict:
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
