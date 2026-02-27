"""
Shared utilities for the security analysis pipeline.

Agent-specific instructions have been moved to the security_agents/ package.
This module retains only shared prompt helpers.
"""


def get_analysis_prompt(code: str) -> str:
    """Generate the analysis prompt for the security agent pipeline."""
    return f"Please analyze the following Python code for security vulnerabilities:\n\n{code}"


def enhance_summary(code_length: int, agent_summary: str) -> str:
    """Enhance the agent's summary with additional context."""
    return f"Analyzed {code_length} characters of Python code. {agent_summary}"
