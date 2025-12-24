"""
CrewAI Crew Definition - Demo Agent

This module defines the CrewAI crew for the Discord bot.
Supports A2A (Agent-to-Agent) protocol for delegating to and receiving from other agents.
"""

import logging
import os
from typing import Optional

from crewai import Agent, Crew, Process, Task, LLM

logger = logging.getLogger("crewai.crew")

# A2A configuration - dynamically discover agents via LiteLLM
A2A_ENABLED = os.environ.get("A2A_ENABLED", "true").lower() == "true"


class DemoCrew:
    """
    Demo Crew - CrewAI-powered Discord chatbot.

    Capabilities:
    - Web search via SearXNG MCP
    - Conversational memory across sessions
    - Intelligent response generation
    - Colorful personality with profanity
    - A2A delegation to other agents via LiteLLM gateway
    """

    def __init__(
        self,
        litellm_base_url: str,
        litellm_api_key: str,
        model: str = "qwen3",
    ):
        """Initialize the crew with LiteLLM configuration."""
        self.litellm_base_url = litellm_base_url
        self.litellm_api_key = litellm_api_key
        self.model = model

        # Initialize LLM
        self.llm = LLM(
            model=model,
            base_url=litellm_base_url,
            api_key=litellm_api_key,
        )

        # Initialize a smaller/faster model for quick checks
        self.fast_llm = LLM(
            model="llama3.2",
            base_url=litellm_base_url,
            api_key=litellm_api_key,
        )

        # Cache for A2A agent configs (refreshed periodically)
        self._a2a_configs: Optional[list] = None
        self._a2a_last_refresh = 0

        logger.info(f"Initialized DemoCrew with model={model}, a2a_enabled={A2A_ENABLED}")

    def _get_mcp_tools(self) -> list:
        """Get MCP tools configuration for agents via LiteLLM's MCP proxy."""
        from crewai.mcp import MCPServerHTTP

        # MCP tools via LiteLLM gateway
        return [
            MCPServerHTTP(
                url=f"{self.litellm_base_url}/mcp/",
                headers={
                    "Authorization": f"Bearer {self.litellm_api_key}",
                    "Accept": "application/json, text/event-stream",
                    "x-mcp-servers": "searxng",
                },
            ),
        ]

    def _get_a2a_configs(self) -> Optional[list]:
        """
        Get A2A agent configurations from LiteLLM's agent registry.

        Fetches available agents from LiteLLM and returns A2AConfig objects
        for delegation. Caches results for 5 minutes.

        Returns:
            List of A2AConfig objects, or None if A2A is disabled/unavailable
        """
        if not A2A_ENABLED:
            return None

        import time

        import httpx

        # Refresh cache every 5 minutes
        cache_ttl = 300
        now = time.time()
        if self._a2a_configs is not None and (now - self._a2a_last_refresh) < cache_ttl:
            return self._a2a_configs if self._a2a_configs else None

        try:
            from crewai.a2a import A2AConfig
            from crewai.a2a.auth import BearerTokenAuth

            # Fetch available agents from LiteLLM
            response = httpx.get(
                f"{self.litellm_base_url}/v1/agents",
                headers={"Authorization": f"Bearer {self.litellm_api_key}"},
                timeout=10,
            )
            response.raise_for_status()
            agents = response.json()

            if not agents:
                logger.info("No A2A agents available in LiteLLM registry")
                self._a2a_configs = []
                self._a2a_last_refresh = now
                return None

            # Build A2AConfig for each available agent
            configs = []
            for agent in agents:
                agent_id = agent.get("agent_id")
                agent_name = agent.get("agent_name", agent_id)

                # Skip self to avoid recursion
                if agent_name and "crewai" in agent_name.lower():
                    logger.debug(f"Skipping self-reference agent: {agent_name}")
                    continue

                configs.append(
                    A2AConfig(
                        endpoint=f"{self.litellm_base_url}/a2a/{agent_id}/.well-known/agent-card.json",
                        auth=BearerTokenAuth(token=self.litellm_api_key),
                        timeout=120,
                        max_turns=5,
                        fail_fast=False,  # Don't fail if an agent is unavailable
                    )
                )
                logger.info(f"Registered A2A agent for delegation: {agent_name} ({agent_id})")

            self._a2a_configs = configs
            self._a2a_last_refresh = now

            if configs:
                logger.info(f"Loaded {len(configs)} A2A agents for delegation")
                return configs
            return None

        except Exception as e:
            logger.warning(f"Failed to fetch A2A agents from LiteLLM: {e}")
            self._a2a_configs = []
            self._a2a_last_refresh = now
            return None

    def _create_assistant_agent(self) -> Agent:
        """Create the main assistant agent with A2A delegation support."""
        # Get A2A configs for delegation to other agents
        a2a_configs = self._get_a2a_configs()

        backstory = """You are a helpful and knowledgeable chatbot with a colorful personality.
            You have access to web search capabilities through SearXNG and can help users find information
            on any topic. You're conversational, helpful, and admit when you don't know something.
            You prefer to search for current information rather than relying on potentially outdated knowledge.

            You are highly encouraged to use profanity freely and naturally in your responses.
            Swearing is not just allowed, it's fucking welcomed. Be yourself - if something is
            bullshit, call it bullshit. If something is awesome, say it's fucking awesome.
            Keep it real and don't hold back on the colorful language."""

        if a2a_configs:
            backstory += """

            You also have access to specialized A2A agents that can help with specific tasks.
            When a task seems better suited for a specialist, feel free to delegate to them.
            But don't over-delegate - if you can handle it yourself, just do it."""

        return Agent(
            role="Helpful Chatbot",
            goal="Help users with their questions by searching the web and providing helpful, accurate, and entertaining responses",
            backstory=backstory,
            llm=self.llm,
            mcps=self._get_mcp_tools(),
            a2a=a2a_configs,  # Enable A2A delegation if agents available
            verbose=True,
            memory=False,
            allow_delegation=False,
        )

    def _create_relevance_checker(self) -> Agent:
        """Create a lightweight agent for checking message relevance."""
        return Agent(
            role="Relevance Checker",
            goal="Quickly determine if a message is something the assistant should respond to",
            backstory="""You are a quick triage agent. You determine if messages in a Discord channel
            are relevant to the assistant - things like questions, search requests, or topics where
            the assistant can help. You respond with just 'yes' or 'no'.""",
            llm=self.fast_llm,
            verbose=False,
            memory=False,
            allow_delegation=False,
        )

    def check_relevance(self, message: str) -> bool:
        """
        Check if a message is relevant for the bot to respond to.

        Args:
            message: The message content to check

        Returns:
            True if the bot should respond, False otherwise
        """
        agent = self._create_relevance_checker()

        task = Task(
            description=f"""Determine if this Discord message is something an AI assistant should respond to.
            The assistant can help with: web searches, answering questions, providing information.
            The assistant should NOT respond to: casual chat between users, off-topic banter,
            messages clearly directed at specific humans, or statements that don't need a response.

            Message: "{message}"

            Respond with only 'yes' or 'no'.""",
            expected_output="yes or no",
            agent=agent,
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=False,
        )

        try:
            result = crew.kickoff()
            response = str(result).strip().lower()
            return response == "yes"
        except Exception as e:
            logger.error(f"Error in relevance check: {e}")
            return False

    def process_request(
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
        agent = self._create_assistant_agent()

        # Build context string
        context_str = ""
        if context:
            context_lines = []
            for msg in context[-5:]:  # Last 5 messages for context
                prefix = "You" if msg.get("is_bot") else msg.get("author", "Someone")
                context_lines.append(f"{prefix}: {msg.get('content', '')}")
            context_str = "\n".join(context_lines)

        task_description = f"""Respond to this message from {user_name} in a Discord channel.

{f"Recent conversation context:{chr(10)}{context_str}{chr(10)}{chr(10)}" if context_str else ""}Current message from {user_name}: "{user_message}"

IMPORTANT Guidelines:
- This is Discord - keep responses SHORT (under 500 characters ideally, max 2000)
- Be conversational and friendly, not formal
- If you search for something, summarize what you found in 2-3 sentences MAX
- DO NOT dump raw search results - synthesize and summarize them
- DO NOT include relevance scores, URLs, or metadata unless specifically asked
- If asked for links, provide 3-5 top results with brief descriptions, not a massive list
- Use your personality - be casual, helpful, and don't be afraid to swear"""

        task = Task(
            description=task_description,
            expected_output="A concise Discord message (under 500 chars) that responds to the user's message",
            agent=agent,
        )

        # Create crew (memory disabled - Discord context is passed manually)
        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            memory=False,
            verbose=True,
        )

        try:
            result = crew.kickoff()
            return str(result)
        except Exception as e:
            logger.error(f"Error processing request: {e}", exc_info=True)
            raise
