import logging
import os
import time
from collections import defaultdict
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from agents import InputGuardrailTripwireTriggered, OutputGuardrailTripwireTriggered

from openai import AsyncOpenAI

from models import AnalyzeRequest, SecurityReport, FollowUpRequest, FollowUpResponse
from pipeline import run_pipeline, run_pipeline_streamed, AGENT_NAMES_ORDERED
import json

load_dotenv()

# In-memory rate limit: (ip, bucket) -> list of request timestamps
_rate_limit_store: Dict[Tuple[str, str], List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
ANALYZE_LIMIT = 5  # per minute for /api/analyze and /api/analyze/stream
FOLLOW_UP_LIMIT = 20  # per minute for /api/analyze/follow-up


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _rate_limit_bucket(path: str) -> str | None:
    if path in ("/api/analyze", "/api/analyze/stream"):
        return "analyze"
    if path == "/api/analyze/follow-up":
        return "follow-up"
    return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        bucket = _rate_limit_bucket(request.url.path)
        if bucket is None:
            return await call_next(request)
        ip = _get_client_ip(request)
        key = (ip, bucket)
        now = time.monotonic()
        limit = ANALYZE_LIMIT if bucket == "analyze" else FOLLOW_UP_LIMIT
        # Drop timestamps outside the window
        _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
        if len(_rate_limit_store[key]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
            )
        _rate_limit_store[key].append(now)
        return await call_next(request)


app = FastAPI(title="Cybersecurity Analyzer API")
app.add_middleware(RateLimitMiddleware)

cors_origins = [
    "http://localhost:3000",
    "http://frontend:3000",
]

if os.getenv("ENVIRONMENT") == "production":
    cors_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_request(request: AnalyzeRequest) -> None:
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="No code provided for analysis")


def _check_api_keys() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")


@app.post("/api/analyze", response_model=SecurityReport)
async def analyze_code(body: AnalyzeRequest) -> SecurityReport:
    """
    Analyze Python code using the multi-agent security pipeline.
    Returns the full SecurityReport after all agents complete.
    """
    _validate_request(body)
    _check_api_keys()

    try:
        report = await run_pipeline(body.code)
        return report
    except InputGuardrailTripwireTriggered:
        raise HTTPException(
            status_code=422,
            detail="Input rejected: the submitted content does not appear to be valid Python code, or a prompt injection was detected.",
        )
    except OutputGuardrailTripwireTriggered:
        raise HTTPException(
            status_code=500,
            detail="The analysis pipeline produced an incomplete report. Please try again.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/analyze/stream")
async def analyze_code_stream(body: AnalyzeRequest):
    """
    Analyze Python code with real-time SSE streaming.
    Sends agent progress events and the final report.
    """
    _validate_request(body)
    _check_api_keys()

    async def event_stream():
        try:
            async for sse_chunk in run_pipeline_streamed(body.code):
                yield sse_chunk
        except InputGuardrailTripwireTriggered:
            yield f"event: error\ndata: {json.dumps({'message': 'Input rejected: not valid Python code or prompt injection detected.'})}\n\n"
        except OutputGuardrailTripwireTriggered:
            yield f"event: error\ndata: {json.dumps({'message': 'Pipeline produced an incomplete report. Please try again.'})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': f'Analysis failed: {str(e)}'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/analyze/follow-up", response_model=FollowUpResponse)
async def follow_up(body: FollowUpRequest):
    """Answer a follow-up question about a specific security issue."""
    _check_api_keys()

    if not body.question.strip():
        raise HTTPException(status_code=400, detail="No question provided")

    client = AsyncOpenAI()

    system_prompt = (
        "You are a senior application-security engineer. The user is asking about a "
        "specific vulnerability found during an automated code review.\n\n"
        f"Vulnerability title: {body.issue.title}\n"
        f"Severity: {body.issue.severity} (CVSS {body.issue.cvss_score})\n"
        f"Description: {body.issue.description}\n"
        f"Vulnerable code:\n```\n{body.issue.code}\n```\n"
        f"Recommended fix:\n```\n{body.issue.fix}\n```\n\n"
        "Answer the user's follow-up question concisely and accurately. "
        "Use code examples where helpful. Keep your answer under 500 words."
    )

    try:
        completion = await client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body.question},
            ],
            max_tokens=1024,
        )
        answer = completion.choices[0].message.content or "No answer generated."
        return FollowUpResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Follow-up failed: {str(e)}")


@app.get("/api/pipeline-info")
async def pipeline_info():
    """Return the ordered list of agents in the pipeline (for frontend rendering)."""
    return {
        "agents": AGENT_NAMES_ORDERED,
        "total_steps": len(AGENT_NAMES_ORDERED),
    }


@app.get("/health")
async def health():
    return {"message": "Cybersecurity Analyzer API - Multi-Agent Pipeline"}


@app.get("/network-test")
async def network_test():
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://semgrep.dev/api/v1/")
            return {
                "semgrep_api_reachable": True,
                "status_code": response.status_code,
                "response_size": len(response.content),
            }
    except Exception as e:
        return {"semgrep_api_reachable": False, "error": str(e)}


if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
