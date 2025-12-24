"""
A2A Protocol Server for CrewAI Demo Agent

Exposes the CrewAI agent as an A2A-compatible endpoint that other agents can invoke.
Implements the Agent-to-Agent (A2A) JSON-RPC 2.0 protocol.
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger("crewai.a2a")

# Agent metadata
AGENT_NAME = os.environ.get("BOT_NAME", "CrewAI Demo")
AGENT_DESCRIPTION = "A helpful Discord chatbot with web search capabilities. Can answer questions, search the web, and assist with various tasks."
AGENT_VERSION = "1.0.0"


class A2AServer:
    """
    A2A Protocol Server implementation.

    Exposes:
    - GET /.well-known/agent-card.json - Agent discovery
    - POST / - JSON-RPC 2.0 message handling
    """

    def __init__(self, crew, host: str = "0.0.0.0", port: int = 10001):
        """
        Initialize the A2A server.

        Args:
            crew: DemoCrew instance for processing requests
            host: Host to bind to
            port: Port to listen on
        """
        self.crew = crew
        self.host = host
        self.port = port
        self.app = FastAPI(title=f"{AGENT_NAME} A2A Server")
        self._setup_routes()

    def _setup_routes(self):
        """Configure FastAPI routes for A2A protocol."""

        @self.app.get("/.well-known/agent-card.json")
        async def agent_card():
            """Return the agent card for discovery."""
            return self._get_agent_card()

        @self.app.post("/")
        async def handle_message(request: Request):
            """Handle A2A JSON-RPC 2.0 requests."""
            try:
                body = await request.json()
                return await self._handle_jsonrpc(body)
            except json.JSONDecodeError:
                return self._jsonrpc_error(None, -32700, "Parse error")
            except Exception as e:
                logger.error(f"Error handling A2A request: {e}", exc_info=True)
                return self._jsonrpc_error(None, -32603, f"Internal error: {str(e)}")

        @self.app.get("/health")
        async def health():
            """Health check endpoint."""
            return {"status": "healthy", "agent": AGENT_NAME}

    def _get_agent_card(self) -> dict:
        """
        Generate the agent card (metadata) for A2A discovery.

        Returns:
            Agent card dictionary following A2A spec
        """
        base_url = os.environ.get("A2A_BASE_URL", f"http://localhost:{self.port}")

        return {
            "name": AGENT_NAME,
            "description": AGENT_DESCRIPTION,
            "version": AGENT_VERSION,
            "url": base_url,
            "capabilities": {
                "streaming": False,  # We'll add streaming later
                "pushNotifications": False,
                "stateTransitionHistory": False,
            },
            "skills": [
                {
                    "id": "web-search",
                    "name": "Web Search",
                    "description": "Search the web for current information using SearXNG",
                },
                {
                    "id": "conversation",
                    "name": "Conversational Assistant",
                    "description": "Answer questions and engage in helpful conversation",
                },
            ],
            "defaultInputModes": ["text"],
            "defaultOutputModes": ["text"],
        }

    async def _handle_jsonrpc(self, body: dict) -> JSONResponse:
        """
        Handle JSON-RPC 2.0 requests per A2A protocol.

        Args:
            body: Parsed JSON-RPC request body

        Returns:
            JSON-RPC response
        """
        # Validate JSON-RPC structure
        if body.get("jsonrpc") != "2.0":
            return self._jsonrpc_error(body.get("id"), -32600, "Invalid Request: missing jsonrpc 2.0")

        request_id = body.get("id")
        method = body.get("method")
        params = body.get("params", {})

        logger.info(f"A2A request: method={method}, id={request_id}")

        # Route to appropriate handler
        if method == "message/send":
            return await self._handle_message_send(request_id, params)
        elif method == "message/stream":
            # For now, fall back to non-streaming
            return await self._handle_message_send(request_id, params)
        elif method == "tasks/get":
            return await self._handle_tasks_get(request_id, params)
        elif method == "tasks/cancel":
            return await self._handle_tasks_cancel(request_id, params)
        else:
            return self._jsonrpc_error(request_id, -32601, f"Method not found: {method}")

    async def _handle_message_send(self, request_id: str, params: dict) -> JSONResponse:
        """
        Handle message/send - the main A2A interaction method.

        Args:
            request_id: JSON-RPC request ID
            params: Request parameters containing the message

        Returns:
            JSON-RPC response with task result
        """
        message = params.get("message", {})
        parts = message.get("parts", [])

        # Extract text from message parts
        text_content = ""
        for part in parts:
            if part.get("kind") == "text":
                text_content += part.get("text", "") + " "

        text_content = text_content.strip()

        if not text_content:
            return self._jsonrpc_error(request_id, -32602, "Invalid params: no text content in message")

        # Generate task and context IDs
        task_id = str(uuid.uuid4())
        context_id = params.get("contextId", str(uuid.uuid4()))
        message_id = message.get("messageId", str(uuid.uuid4()))

        logger.info(f"Processing A2A message: task={task_id}, content={text_content[:100]}...")

        try:
            # Process through CrewAI
            result = await asyncio.to_thread(
                self.crew.process_request,
                user_message=text_content,
                context=None,  # A2A requests don't have Discord context
                user_name="A2A Agent",
            )

            # Build A2A response
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "kind": "task",
                        "id": task_id,
                        "contextId": context_id,
                        "status": {
                            "state": "completed",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                        "artifacts": [
                            {
                                "artifactId": str(uuid.uuid4()),
                                "name": "response",
                                "parts": [{"kind": "text", "text": result}],
                            }
                        ],
                        "history": [
                            {
                                "role": "user",
                                "parts": parts,
                                "messageId": message_id,
                            },
                            {
                                "role": "agent",
                                "parts": [{"kind": "text", "text": result}],
                                "messageId": str(uuid.uuid4()),
                            },
                        ],
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error processing A2A message: {e}", exc_info=True)
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "kind": "task",
                        "id": task_id,
                        "contextId": context_id,
                        "status": {
                            "state": "failed",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "message": {"role": "agent", "parts": [{"kind": "text", "text": f"Error: {str(e)}"}]},
                        },
                    },
                }
            )

    async def _handle_tasks_get(self, request_id: str, params: dict) -> JSONResponse:
        """Handle tasks/get - we don't persist tasks, so always return not found."""
        task_id = params.get("id")
        return self._jsonrpc_error(request_id, -32602, f"Task not found: {task_id}")

    async def _handle_tasks_cancel(self, request_id: str, params: dict) -> JSONResponse:
        """Handle tasks/cancel - we process synchronously, so nothing to cancel."""
        task_id = params.get("id")
        return JSONResponse(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "kind": "task",
                    "id": task_id,
                    "status": {
                        "state": "canceled",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                },
            }
        )

    def _jsonrpc_error(self, request_id: Optional[str], code: int, message: str) -> JSONResponse:
        """
        Build a JSON-RPC error response.

        Args:
            request_id: Request ID (can be None for parse errors)
            code: Error code
            message: Error message

        Returns:
            JSON-RPC error response
        """
        return JSONResponse(
            {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}},
            status_code=200,  # JSON-RPC errors still return 200
        )

    async def start(self):
        """Start the A2A server."""
        import uvicorn

        config = uvicorn.Config(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info",
        )
        server = uvicorn.Server(config)
        logger.info(f"Starting A2A server on {self.host}:{self.port}")
        await server.serve()
