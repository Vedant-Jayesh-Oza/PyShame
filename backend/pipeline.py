"""
Multi-agent pipeline orchestration.

Wires the 6 agents together via handoffs, attaches guardrails,
and provides both blocking and streaming execution modes.
"""

import json
import logging
import os
import tempfile
import time
from typing import AsyncGenerator, List, Optional

from pydantic import ValidationError
from agents import Agent, Runner, trace
from agents.stream_events import RunItemStreamEvent, RawResponsesStreamEvent
from agents.items import HandoffOutputItem, ToolCallItem, ToolCallOutputItem
from openai.types.responses import ResponseTextDeltaEvent

from models import SecurityReport
from mcp_servers import create_semgrep_server
from guardrails import python_code_guardrail

from security_agents.synthesizer import create_synthesizer_agent
from security_agents.blue_team import create_blue_team_agent
from security_agents.red_team import create_red_team_agent
from security_agents.code_review import create_code_review_agent
from security_agents.static_analysis import create_static_analysis_agent
from security_agents.triage import create_triage_agent

logger = logging.getLogger(__name__)

AGENT_NAMES_ORDERED = [
    "Triage Agent",
    "Static Analysis Agent",
    "Code Review Agent",
    "Red Team Agent",
    "Blue Team Agent",
    "Report Synthesizer",
]

AGENT_DESCRIPTIONS = {
    "Triage Agent": "Classifying code type and risk areas",
    "Static Analysis Agent": "Running Semgrep static analysis scan",
    "Code Review Agent": "Deep-reviewing logic vulnerabilities",
    "Red Team Agent": "Generating exploit scenarios",
    "Blue Team Agent": "Building remediation strategies",
    "Report Synthesizer": "Compiling final security report",
}

THOUGHT_BATCH_SIZE = 60


def _build_agent_chain(semgrep_server):
    """
    Build the handoff chain bottom-up (last agent first, since each agent
    needs a reference to the next one in its handoffs list).
    """
    synthesizer = create_synthesizer_agent()

    blue_team = create_blue_team_agent(handoffs=[synthesizer])
    red_team = create_red_team_agent(handoffs=[blue_team])
    code_review = create_code_review_agent(handoffs=[red_team])
    static_analysis = create_static_analysis_agent(semgrep_server, handoffs=[code_review])
    triage = create_triage_agent(handoffs=[static_analysis])
    triage.input_guardrails = [python_code_guardrail]

    return triage


def _extract_report(final_output) -> Optional[SecurityReport]:
    """
    Safely extract a SecurityReport from the runner's final output.
    The output_type on the Synthesizer agent should produce a SecurityReport,
    but if the LLM returns raw text we fall back to JSON parsing.
    """
    logger.info(
        "final_output type=%s, preview=%.200s",
        type(final_output).__name__,
        str(final_output)[:200],
    )

    if isinstance(final_output, SecurityReport):
        return final_output

    if isinstance(final_output, dict):
        try:
            return SecurityReport(**final_output)
        except (ValidationError, TypeError) as exc:
            logger.warning("Dict final_output failed validation: %s", exc)

    if isinstance(final_output, str):
        logger.warning("Final output was a string; attempting JSON parse")
        try:
            return SecurityReport.model_validate_json(final_output)
        except (ValidationError, json.JSONDecodeError):
            pass
        try:
            data = json.loads(final_output)
            return SecurityReport(**data)
        except (json.JSONDecodeError, ValidationError, TypeError):
            pass

    return None  # signal that async fallback is needed


async def _force_structured_report(raw_text: str) -> SecurityReport:
    """
    When the Synthesizer agent fails to produce structured output, use a
    clean single-turn agent call to force-extract a SecurityReport from the
    raw conversation text. Works reliably because there's no long chat
    history to confuse the model.
    """
    extractor = Agent(
        name="Report Extractor",
        instructions=(
            "You receive the combined output of a multi-agent security analysis pipeline. "
            "Extract ALL security issues, exploit scenarios, and remediation priorities "
            "into the required JSON schema. Be thorough -- every vulnerability mentioned "
            "must appear in the issues list with title, description, code snippet, fix, "
            "CVSS score, severity, and source. Keep descriptions concise but complete."
        ),
        model="gpt-4.1-mini",
        output_type=SecurityReport,
    )
    result = await Runner.run(extractor, input=raw_text, max_turns=1)
    if isinstance(result.final_output, SecurityReport):
        return result.final_output
    return SecurityReport(summary=str(raw_text)[:500], issues=[])


async def run_pipeline(code: str) -> SecurityReport:
    """
    Run the full multi-agent pipeline (blocking).
    Returns the final SecurityReport.
    """
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", prefix="pyshame_", delete=False
    ) as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        prompt = _build_prompt(code, tmp_path)
        with trace("Multi-Agent Security Pipeline"):
            async with create_semgrep_server() as semgrep:
                triage = _build_agent_chain(semgrep)
                result = await Runner.run(triage, input=prompt, max_turns=25)
                report = _extract_report(result.final_output)
                if report is None:
                    logger.info("Synthesizer did not produce structured output; using extraction fallback")
                    report = await _force_structured_report(str(result.final_output))
                return report
    finally:
        os.unlink(tmp_path)


async def run_pipeline_streamed(code: str) -> AsyncGenerator[str, None]:
    """
    Run the full multi-agent pipeline with SSE streaming.
    Yields server-sent events for agent transitions, LLM thinking,
    tool calls, Semgrep findings, and handoff context.
    """
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", prefix="pyshame_", delete=False
    ) as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        prompt = _build_prompt(code, tmp_path)

        current_agent = AGENT_NAMES_ORDERED[0]
        step = 1
        total = len(AGENT_NAMES_ORDERED)
        agent_start_time = time.monotonic()
        thought_buffer = ""

        yield _sse(
            "agent_start",
            {"agent": current_agent, "step": step, "total": total},
        )

        with trace("Multi-Agent Security Pipeline (Streamed)"):
            async with create_semgrep_server() as semgrep:
                triage = _build_agent_chain(semgrep)
                result = Runner.run_streamed(triage, input=prompt, max_turns=25)

                async for event in result.stream_events():
                    if isinstance(event, RunItemStreamEvent):
                        logger.info(
                            "RunItemStreamEvent: name=%s, item_type=%s",
                            event.name,
                            type(event.item).__name__,
                        )

                    if isinstance(event, RawResponsesStreamEvent):
                        if isinstance(event.data, ResponseTextDeltaEvent):
                            thought_buffer += event.data.delta
                            if len(thought_buffer) >= THOUGHT_BATCH_SIZE:
                                yield _sse("agent_thought", {
                                    "agent": current_agent,
                                    "text": thought_buffer,
                                })
                                thought_buffer = ""

                    elif isinstance(event, RunItemStreamEvent):
                        item = event.item

                        if isinstance(item, ToolCallItem):
                            tool_name = getattr(item.raw_item, "name", "unknown")
                            yield _sse("tool_called", {
                                "agent": current_agent,
                                "tool": tool_name,
                            })

                        elif isinstance(item, ToolCallOutputItem):
                            logger.info(
                                "ToolCallOutputItem from %s — output type: %s, preview: %.300s",
                                current_agent,
                                type(item.output).__name__,
                                str(item.output)[:300],
                            )
                            if current_agent == "Static Analysis Agent":
                                findings = _parse_semgrep_findings(item.output)
                                logger.info("Parsed %d semgrep findings", len(findings))
                                for finding in findings:
                                    yield _sse("semgrep_finding", finding)

                        elif isinstance(item, HandoffOutputItem):
                            if thought_buffer:
                                yield _sse("agent_thought", {
                                    "agent": current_agent,
                                    "text": thought_buffer,
                                })
                                thought_buffer = ""

                            elapsed_ms = int((time.monotonic() - agent_start_time) * 1000)
                            target_name = item.target_agent.name

                            yield _sse("agent_complete", {
                                "agent": current_agent,
                                "step": step,
                                "elapsed_ms": elapsed_ms,
                            })

                            yield _sse("handoff", {
                                "from": current_agent,
                                "to": target_name,
                                "summary": _handoff_summary(current_agent, target_name),
                            })

                            if target_name in AGENT_NAMES_ORDERED:
                                step = AGENT_NAMES_ORDERED.index(target_name) + 1
                            else:
                                step += 1
                            current_agent = target_name
                            agent_start_time = time.monotonic()

                            yield _sse("agent_start", {
                                "agent": current_agent,
                                "step": step,
                                "total": total,
                            })

                if thought_buffer:
                    yield _sse("agent_thought", {
                        "agent": current_agent,
                        "text": thought_buffer,
                    })

                elapsed_ms = int((time.monotonic() - agent_start_time) * 1000)
                yield _sse("agent_complete", {
                    "agent": current_agent,
                    "step": step,
                    "elapsed_ms": elapsed_ms,
                })

                report = _extract_report(result.final_output)
                if report is None:
                    logger.info("Synthesizer did not produce structured output; using extraction fallback")
                    report = await _force_structured_report(str(result.final_output))
                yield _sse("analysis_complete", report.model_dump())
    finally:
        os.unlink(tmp_path)


def _build_prompt(code: str, tmp_path: str) -> str:
    return (
        f"Please analyze the following Python code for security vulnerabilities.\n\n"
        f"The code has been saved to a local file at: {tmp_path}\n"
        f"Use this absolute path when calling the semgrep_scan tool.\n\n"
        f"Here is the code:\n\n{code}"
    )


HANDOFF_SUMMARIES = {
    ("Triage Agent", "Static Analysis Agent"):
        "Passing code classification and risk areas to static analysis",
    ("Static Analysis Agent", "Code Review Agent"):
        "Passing Semgrep findings for deep manual code review",
    ("Code Review Agent", "Red Team Agent"):
        "Passing all findings for exploit scenario generation",
    ("Red Team Agent", "Blue Team Agent"):
        "Passing exploit scenarios for remediation planning",
    ("Blue Team Agent", "Report Synthesizer"):
        "Passing fixes and defense strategies for final report",
}


def _handoff_summary(from_agent: str, to_agent: str) -> str:
    return HANDOFF_SUMMARIES.get(
        (from_agent, to_agent),
        f"Handing off from {from_agent} to {to_agent}",
    )


def _parse_semgrep_findings(output) -> List[dict]:
    """Best-effort extraction of individual findings from Semgrep MCP output."""
    findings: List[dict] = []
    try:
        data = _unwrap_mcp_output(output)

        results = []
        if isinstance(data, dict):
            results = data.get("results", data.get("findings", []))
        elif isinstance(data, list):
            results = data

        for r in results:
            if isinstance(r, dict):
                findings.append({
                    "rule_id": r.get("check_id", r.get("rule_id", r.get("id", "unknown"))),
                    "message": r.get("extra", {}).get("message", r.get("message", "")),
                    "severity": r.get("extra", {}).get("severity", r.get("severity", "info")),
                    "file": r.get("path", r.get("file", "")),
                    "line": r.get("start", {}).get("line", r.get("line", 0)),
                })
    except (json.JSONDecodeError, TypeError, AttributeError) as exc:
        logger.warning("Could not parse Semgrep output: %s", exc)
    return findings


def _unwrap_mcp_output(output) -> dict:
    """
    MCP tool responses arrive as '{"type":"text","text":"{...}"}' or as
    a list of such content blocks. Unwrap to get the inner JSON payload.
    """
    if isinstance(output, str):
        data = json.loads(output)
    elif isinstance(output, dict):
        data = output
    elif isinstance(output, list):
        for item in output:
            if isinstance(item, dict) and item.get("type") == "text":
                return json.loads(item["text"])
        return {}
    else:
        return {}

    if isinstance(data, dict) and data.get("type") == "text" and "text" in data:
        return json.loads(data["text"])

    return data


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
