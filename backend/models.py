"""
Pydantic models for the multi-agent security analysis pipeline.

Defines structured output types for each agent stage and the final report,
plus SSE streaming event types for the frontend.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class SeverityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SecurityIssue(BaseModel):
    title: str = Field(description="Brief title of the security vulnerability")
    description: str = Field(
        description="Detailed description of the security issue and its potential impact"
    )
    code: str = Field(
        description="The specific vulnerable code snippet that demonstrates the issue"
    )
    fix: str = Field(description="Recommended code fix or mitigation strategy")
    cvss_score: float = Field(
        description="CVSS score from 0.0 to 10.0 representing severity"
    )
    severity: SeverityLevel = Field(description="Severity level")
    source: str = Field(
        default="ai_review",
        description="Which agent found this issue: semgrep, ai_review, code_review, red_team",
    )


class ExploitScenario(BaseModel):
    title: str = Field(description="Name of the exploit scenario")
    attack_vector: str = Field(description="How an attacker would initiate this attack")
    steps: List[str] = Field(description="Step-by-step attack execution")
    impact: str = Field(description="What damage this exploit could cause")
    likelihood: str = Field(description="Likelihood of exploitation: high, medium, low")
    related_issues: List[str] = Field(
        default_factory=list,
        description="Titles of SecurityIssues this exploit chains together",
    )


class SecurityReport(BaseModel):
    summary: str = Field(description="Executive summary of the security analysis")
    code_type: str = Field(
        default="unknown",
        description="Classification of the code: web_app, cli, data_pipeline, api_server, etc.",
    )
    risk_areas: List[str] = Field(
        default_factory=list,
        description="Key risk areas identified: auth, crypto, input_handling, file_io, network",
    )
    issues: List[SecurityIssue] = Field(
        description="List of identified security vulnerabilities"
    )
    exploit_scenarios: List[ExploitScenario] = Field(
        default_factory=list,
        description="Proof-of-concept exploit scenarios from red team analysis",
    )
    remediation_priority: List[str] = Field(
        default_factory=list,
        description="Ordered list of issue titles by remediation priority",
    )


class AnalyzeRequest(BaseModel):
    code: str



class AgentStep(BaseModel):
    agent: str
    step: int
    total: int = 6
    status: str = "running"


class StreamEvent(BaseModel):
    event: str
    data: dict
