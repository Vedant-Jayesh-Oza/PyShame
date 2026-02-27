import logging
import os

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from agents import InputGuardrailTripwireTriggered, OutputGuardrailTripwireTriggered

from models import AnalyzeRequest, SecurityReport
from pipeline import run_pipeline, run_pipeline_streamed, AGENT_NAMES_ORDERED
import json

load_dotenv()

app = FastAPI(title="Cybersecurity Analyzer API")

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
async def analyze_code(request: AnalyzeRequest) -> SecurityReport:
    """
    Analyze Python code using the multi-agent security pipeline.
    Returns the full SecurityReport after all agents complete.
    """
    _validate_request(request)
    _check_api_keys()

    try:
        report = await run_pipeline(request.code)
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
async def analyze_code_stream(request: AnalyzeRequest):
    """
    Analyze Python code with real-time SSE streaming.
    Sends agent progress events and the final report.
    """
    _validate_request(request)
    _check_api_keys()

    async def event_stream():
        try:
            async for sse_chunk in run_pipeline_streamed(request.code):
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
