"""
MCP server configurations and setup for security analysis tools.

Note: When the pipeline runs, the Semgrep MCP server is spawned as a subprocess. You may see
a one-time warning "User doesn't have the Pro Engine installed, not running semgrep mcp daemon".
That is expected; the community Semgrep engine is used and analysis works without Pro.
"""

import os
from typing import Dict, Any
from agents.mcp import MCPServerStdio, create_static_tool_filter


def get_semgrep_server_params() -> Dict[str, Any]:
    """Get configuration parameters for the Semgrep MCP server."""
    semgrep_app_token = os.getenv("SEMGREP_APP_TOKEN")

    env = {
        "SEMGREP_APP_TOKEN": semgrep_app_token,
        "PYTHONUNBUFFERED": "1",
        "SEMGREP_MCP_DISABLE_TRACING": "true",
    }

    return {"command": "semgrep", "args": ["mcp"], "env": env}


def create_semgrep_server() -> MCPServerStdio:
    """Create and configure the Semgrep MCP server instance."""
    params = get_semgrep_server_params()
    return MCPServerStdio(
        params=params,
        client_session_timeout_seconds=120,
        tool_filter=create_static_tool_filter(allowed_tool_names=["semgrep_scan"]),
    )
