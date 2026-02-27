"""
Report Synthesizer Agent -- Final aggregator.

Combines all findings from the pipeline into a single structured
SecurityReport. This is the last agent in the handoff chain and
produces the final structured output.
"""

from agents import Agent
from models import SecurityReport

SYNTHESIZER_INSTRUCTIONS = """You are the Report Synthesizer. You are the FINAL agent. You have NO handoffs. Your ONLY job is to output structured JSON.

Read the full conversation history from: Triage, Static Analysis, Code Review, Red Team, and Blue Team agents. Then produce ONE JSON object matching the SecurityReport schema exactly.

IMPORTANT: Do NOT write explanations, commentary, or markdown. Output ONLY the JSON object.

Fields to populate:

"summary": 2-3 sentence executive summary (code type, issue count, risk level, most critical finding).
"code_type": From Triage Agent (web_app, cli_tool, api_server, script, etc.).
"risk_areas": From Triage Agent's identified risk areas as a list of strings.
"issues": Deduplicated list from Static Analysis + Code Review + Red Team. Each issue needs:
  - "title": Specific vulnerability name
  - "description": Impact and details
  - "code": Vulnerable code snippet
  - "fix": Blue Team's recommended fix code
  - "cvss_score": 0.0 to 10.0
  - "severity": "critical" or "high" or "medium" or "low"
  - "source": "semgrep" or "ai_review" or "code_review" or "red_team"
"exploit_scenarios": From Red Team. Each needs title, attack_vector, steps (list), impact, likelihood, related_issues (list of issue titles).
"remediation_priority": Blue Team's ordered list of issue titles.

Rules:
- Deduplicate: if multiple agents found the same issue, merge into ONE entry.
- Every issue MUST have a non-empty "fix" field.
- exploit_scenarios and remediation_priority must reference issues by their exact "title".
"""


def create_synthesizer_agent() -> Agent:
    return Agent(
        name="Report Synthesizer",
        instructions=SYNTHESIZER_INSTRUCTIONS,
        model="gpt-4.1-mini",
        output_type=SecurityReport,
        handoff_description="Combines all agent findings into the final security report",
    )
