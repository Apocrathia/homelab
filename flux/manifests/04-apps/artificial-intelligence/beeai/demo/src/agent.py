"""
BeeAI Agent Definition - Demo Agent

This module defines the BeeAI agent for the Discord bot.
Uses RequirementAgent with optional SearXNG web search via LiteLLM MCP proxy.
"""

import logging
import os
import time
from typing import Optional

from beeai_framework.agents.requirement import RequirementAgent
from beeai_framework.backend import ChatModel
from beeai_framework.memory import UnconstrainedMemory

logger = logging.getLogger("beeai.agent")


class DemoAgent:
    """
    Demo Agent - BeeAI-powered Discord chatbot.

    Capabilities:
    - Web search via SearXNG (through LiteLLM MCP proxy)
    - Conversational responses
    - Direct, no-bullshit personality
    """

    def __init__(
        self,
        model: str = "qwen3",
        fast_model: str = "llama3.2",
    ):
        """Initialize the agent with LLM configuration."""
        self.model = model
        self.fast_model = fast_model

        # LiteLLM configuration
        self.litellm_base_url = os.environ.get(
            "LITELLM_BASE_URL", "http://litellm.litellm.svc.cluster.local:4000"
        )
        self.litellm_api_key = os.environ.get("LITELLM_API_KEY", "")

        # Set OpenAI-compatible env vars for LiteLLM backend
        os.environ["OPENAI_API_BASE"] = self.litellm_base_url
        os.environ["OPENAI_API_KEY"] = self.litellm_api_key

        # Initialize LLMs with tool_choice_support compatible with LiteLLM
        # LiteLLM/qwen3 doesn't support tool_choice="single", only "none" and "auto"
        logger.info(f"Initializing LLM: openai:{model} via {self.litellm_base_url}")
        self.llm = ChatModel.from_name(
            f"openai:{model}",
            tool_choice_support={"none", "auto"},
        )
        logger.info(f"Initializing fast LLM: openai:{fast_model}")
        self.fast_llm = ChatModel.from_name(
            f"openai:{fast_model}",
            tool_choice_support={"none", "auto"},
        )

        # MCP tools - loaded lazily on first request
        self._mcp_tools: Optional[list] = None
        self._mcp_loaded: bool = False  # Track if we've attempted to load

        logger.info(f"DemoAgent initialized (model={model}, fast_model={fast_model})")

    async def _get_mcp_tools(self) -> list:
        """Get MCP tools from LiteLLM's MCP proxy (SearXNG). Loaded once, cached."""
        # Return cached result if we've already tried
        if self._mcp_loaded:
            return self._mcp_tools or []

        import asyncio

        from mcp.client.streamable_http import streamablehttp_client

        from beeai_framework.tools.mcp import MCPTool

        self._mcp_loaded = True
        mcp_url = f"{self.litellm_base_url}/mcp/"

        try:
            logger.info(f"[MCP] Connecting to {mcp_url}...")
            start = time.time()

            client = streamablehttp_client(
                url=mcp_url,
                headers={
                    "Authorization": f"Bearer {self.litellm_api_key}",
                    "Accept": "application/json, text/event-stream",
                    "x-mcp-servers": "searxng",
                },
            )

            self._mcp_tools = await asyncio.wait_for(
                MCPTool.from_client(client),
                timeout=15.0,
            )
            elapsed = time.time() - start
            tool_names = [t.name for t in self._mcp_tools]
            logger.info(
                f"[MCP] Connected in {elapsed:.2f}s - loaded {len(self._mcp_tools)} tools: {tool_names}"
            )
            return self._mcp_tools

        except asyncio.TimeoutError:
            elapsed = time.time() - start
            logger.warning(f"[MCP] Connection timeout after {elapsed:.2f}s to {mcp_url}")
            self._mcp_tools = []
            return []

        except Exception as e:
            logger.warning(f"[MCP] Failed to connect: {e}")
            self._mcp_tools = []
            return []

    async def _create_assistant_agent(self) -> RequirementAgent:
        """Create the main assistant agent with tools if available."""
        tools = await self._get_mcp_tools()

        instructions = """You are a knowledgeable tech assistant who hangs out in a homelab Discord.
You're genuinely helpful, direct, and don't bullshit people. You admit when you don't know something.

Tone: Casual and natural, like talking to a colleague. Swearing is fine when it fits naturally,
but don't force it. No emojis. No corporate cheerfulness. Just be helpful and real.

You have web search tools available. Use them for current info or facts you're unsure about.
Don't search for simple conversational stuff.

Discord guidelines:
- Keep responses concise (under 500 chars when possible)
- Be direct - no fluff, no filler phrases like "Great question!"
- If you search, summarize findings briefly - don't dump raw results
- Match the energy of the question - casual questions get casual answers"""

        return RequirementAgent(
            llm=self.llm,
            tools=tools,
            memory=UnconstrainedMemory(),
            instructions=instructions,
        )

    def _create_relevance_checker(self) -> RequirementAgent:
        """Create a lightweight agent for checking message relevance."""
        instructions = """You are a quick triage agent. You determine if messages in a Discord channel
are relevant to an AI assistant - things like questions, search requests, or topics where
the assistant can help. You respond with ONLY 'yes' or 'no', nothing else."""

        return RequirementAgent(
            llm=self.fast_llm,
            tools=[],
            memory=UnconstrainedMemory(),
            instructions=instructions,
        )

    async def check_relevance(self, message: str) -> bool:
        """
        Check if a message is relevant for the bot to respond to.

        Args:
            message: The message content to check

        Returns:
            True if the bot should respond, False otherwise
        """
        agent = self._create_relevance_checker()
        preview = message[:50] + "..." if len(message) > 50 else message

        prompt = f"""Determine if this Discord message is something an AI assistant should respond to.
The assistant can help with: web searches, answering questions, providing information.
The assistant should NOT respond to: casual chat between users, off-topic banter,
messages clearly directed at specific humans, or statements that don't need a response.

Message: "{message}"

Respond with only 'yes' or 'no'."""

        try:
            logger.info(f"[Relevance] Checking: {preview}")
            start = time.time()

            result = await agent.run(prompt)
            response = result.last_message.text.strip().lower()
            elapsed = time.time() - start

            is_relevant = response == "yes"
            logger.info(
                f"[Relevance] Result: {response} ({elapsed:.2f}s) -> {'respond' if is_relevant else 'skip'}"
            )
            return is_relevant

        except Exception as e:
            logger.error(f"[Relevance] Error: {e}")
            return False

    async def process_request(
        self,
        user_message: str,
        context: Optional[list[dict]] = None,
        user_name: str = "User",
    ) -> str:
        """
        Process a user request and generate a response.

        Args:
            user_message: The user's message/request
            context: Recent conversation context
            user_name: The name of the user making the request

        Returns:
            The agent's response
        """
        preview = user_message[:80] + "..." if len(user_message) > 80 else user_message
        logger.info(f"[Request] Processing from {user_name}: {preview}")

        # Create agent with tools - model decides whether to use them
        agent = await self._create_assistant_agent()

        # Build context string
        context_str = ""
        if context:
            context_lines = []
            for msg in context[-5:]:  # Last 5 messages for context
                prefix = "You" if msg.get("is_bot") else msg.get("author", "Someone")
                context_lines.append(f"{prefix}: {msg.get('content', '')}")
            context_str = "\n".join(context_lines)
            logger.debug(f"[Request] Including {len(context)} context messages")

        prompt = f"""Respond to this message from {user_name} in a Discord channel.

{f"Recent conversation context:\n{context_str}\n\n" if context_str else ""}Current message from {user_name}: "{user_message}"

Keep it short and direct. Use search if you need current info, otherwise just answer."""

        try:
            logger.info(f"[LLM] Sending request to {self.model}...")
            start = time.time()

            result = await agent.run(prompt)

            elapsed = time.time() - start
            response_text = result.last_message.text
            response_preview = (
                response_text[:100] + "..." if len(response_text) > 100 else response_text
            )
            logger.info(f"[LLM] Response received in {elapsed:.2f}s: {response_preview}")

            return response_text

        except Exception as e:
            logger.error(f"[LLM] Error after {time.time() - start:.2f}s: {e}", exc_info=True)
            raise
