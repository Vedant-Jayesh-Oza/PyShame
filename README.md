# PyShame

PyShame is a multi-agent Python security analysis platform. You can upload or edit Python code in the web UI, then run a 6-agent pipeline (Triage -> Static Analysis -> Code Review -> Red Team -> Blue Team -> Report Synthesizer) that combines Semgrep MCP scanning with LLM reasoning and guardrails.

The app streams live agent activity (thoughts, tool calls, Semgrep findings, and handoffs) and returns a structured security report with vulnerabilities, CVSS scores, exploit scenarios, and remediation priority.

## Demo

[**Watch: Current state of the project**]
https://github.com/user-attachments/assets/ca674fb5-6aa5-4e71-97e7-3afe498e81d8


## Core features

- Multi-agent security pipeline with ordered specialist handoffs.
- FastAPI endpoints for both blocking and real-time SSE analysis.
- Input guardrail for Python-only payloads and prompt-injection tripwires.
- Structured security output model (summary, risk areas, issues, exploit scenarios, remediation priority).
- Semgrep MCP integration with parser and fallback behavior if tool output is incomplete.
- Rich frontend workflow: drag-drop/upload `.py`, Monaco editing, load sample snippets, live pipeline timeline, Semgrep finding cards, and detailed issue/result tables.
- Red-team exploit scenario generation and blue-team remediation prioritization.

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.12+, FastAPI, uvicorn, openai-agents, MCP, Semgrep |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Monaco Editor |
| Infra | Docker (single image), Terraform, Microsoft Azure |

## Project structure

| Path | Purpose |
|---|---|
| `backend/` | FastAPI API, guardrails, pipeline orchestration, security agent definitions, Semgrep MCP wiring |
| `frontend/` | Next.js UI for code input, streaming pipeline progress, and security report rendering |
| `terraform/azure/` | Infrastructure for Azure build/deploy/hosting and monitoring |
| `Dockerfile` | Builds frontend static assets and serves frontend + API from one container |

## In progress

- [ ] Deployment on Microsoft Azure
- [ ] Per-issue actions (Show Exploit, Apply Fix) -- then add Ask Follow-up if you want
- [ ] Diff viewer for fixes -- pairs well with Apply Fix
- [ ] Exportable PDF report
- [ ] CVSS score visualizer
- [ ] Agent trace timeline - Observability
- [ ] Prompt injection detection visualization
- [ ] Comparative re-analysis

