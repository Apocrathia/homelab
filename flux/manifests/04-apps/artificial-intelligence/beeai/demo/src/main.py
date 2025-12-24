#!/usr/bin/env python3
"""
BeeAI Discord Agent

A Discord bot powered by BeeAI that can participate in conversations
and perform web searches.

Also exposes an A2A (Agent-to-Agent) protocol endpoint for other agents to invoke.
"""

import asyncio
import logging
import os
import random
import sys
import threading
from typing import Optional

import discord
from discord.ext import commands

from agent import DemoAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("beeai")

# Environment configuration
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN")
LITELLM_BASE_URL = os.environ.get(
    "LITELLM_BASE_URL", "http://litellm.litellm.svc.cluster.local:4000"
)
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY")

# Bot configuration
BOT_NAME = os.environ.get("BOT_NAME", "BeeAI Demo")
RESPONSE_CHANCE = float(os.environ.get("RESPONSE_CHANCE", "0.3"))

# A2A server configuration
A2A_PORT = int(os.environ.get("A2A_PORT", "10001"))
A2A_ENABLED = os.environ.get("A2A_ENABLED", "true").lower() == "true"


class BeeAIBot(commands.Bot):
    """Discord bot with BeeAI integration."""

    def __init__(self, agent: DemoAgent):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.messages = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            description=f"{BOT_NAME} - A helpful chatbot that doesn't hold back",
        )

        self.agent = agent
        self.processing_lock = asyncio.Lock()

    async def setup_hook(self):
        """Called when the bot is starting up."""
        logger.info(f"Bot is starting up as {self.user}")

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Logged in as {self.user} (ID: {self.user.id})")
        logger.info(f"Connected to {len(self.guilds)} guild(s)")

        # Set presence
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="the homelab",
            )
        )

    async def on_message(self, message: discord.Message):
        """Handle incoming messages."""
        # Ignore own messages
        if message.author == self.user:
            return

        # Ignore DMs for now
        if not message.guild:
            return

        # Check if we should respond
        should_respond = await self._should_respond(message)

        if should_respond:
            async with self.processing_lock:
                await self._process_message(message)

        # Process commands
        await self.process_commands(message)

    async def _should_respond(self, message: discord.Message) -> bool:
        """Determine if the bot should respond to a message."""
        preview = message.content[:50] + "..." if len(message.content) > 50 else message.content

        # Always respond to direct mentions
        if self.user.mentioned_in(message):
            logger.info(f"[Discord] Direct mention from {message.author}: {preview}")
            return True

        # Check if message is a reply to the bot
        if message.reference:
            try:
                ref_message = await message.channel.fetch_message(
                    message.reference.message_id
                )
                if ref_message.author == self.user:
                    logger.info(f"[Discord] Reply to bot from {message.author}: {preview}")
                    return True
            except discord.NotFound:
                pass

        # For unprompted responses, use relevance check
        content_lower = message.content.lower()
        triggers = [
            "search for",
            "look up",
            "find me",
            "what is",
            "what are",
            "how do",
            "how to",
            "can you",
            "could you",
            "anyone know",
            "does anyone",
            "help with",
            "?",
        ]

        # Check if message contains trigger phrases
        if any(trigger in content_lower for trigger in triggers):
            logger.info(f"[Discord] Trigger matched from {message.author}: {preview}")
            relevant = await self.agent.check_relevance(message.content)
            logger.info(f"[Discord] Relevance result: {relevant}")
            return relevant

        # Random chance to check any message
        if random.random() < RESPONSE_CHANCE:
            logger.info(f"[Discord] Random sample from {message.author}: {preview}")
            relevant = await self.agent.check_relevance(message.content)
            logger.info(f"[Discord] Relevance result: {relevant}")
            return relevant

        logger.debug(f"[Discord] Ignoring message from {message.author}: {preview}")
        return False

    async def _process_message(self, message: discord.Message):
        """Process a message and generate a response."""
        # Show typing indicator
        async with message.channel.typing():
            try:
                # Clean the message content (remove bot mention)
                content = message.content
                if self.user.mentioned_in(message):
                    content = content.replace(f"<@{self.user.id}>", "").strip()
                    content = content.replace(f"<@!{self.user.id}>", "").strip()

                if not content:
                    content = "Hello! How can I help you?"

                # Get conversation context from recent messages
                context = await self._get_conversation_context(message)
                logger.info(f"[Discord] Fetched {len(context)} context messages")

                # Run the agent
                result = await self.agent.process_request(
                    user_message=content,
                    context=context,
                    user_name=message.author.display_name,
                )

                # Send response (split if too long)
                logger.info(f"[Discord] Sending response ({len(result)} chars)")
                await self._send_response(message, result)

            except Exception as e:
                logger.error(f"[Discord] Error processing message: {e}", exc_info=True)
                await message.reply(
                    "I encountered an error processing your request. Please try again.",
                    mention_author=False,
                )

    async def _get_conversation_context(
        self, message: discord.Message, limit: int = 10
    ) -> list[dict]:
        """Get recent conversation context from the channel."""
        context = []
        try:
            async for msg in message.channel.history(limit=limit, before=message):
                context.append(
                    {
                        "author": msg.author.display_name,
                        "content": msg.content,
                        "is_bot": msg.author == self.user,
                    }
                )
        except Exception as e:
            logger.warning(f"Could not fetch conversation context: {e}")

        return list(reversed(context))

    async def _send_response(self, message: discord.Message, response: str):
        """Send a response, splitting if necessary."""
        # Discord message limit is 2000 characters
        max_length = 1900

        if len(response) <= max_length:
            await message.reply(response, mention_author=False)
        else:
            # Split response into chunks
            chunks = []
            current_chunk = ""

            for line in response.split("\n"):
                if len(current_chunk) + len(line) + 1 <= max_length:
                    current_chunk += line + "\n"
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = line + "\n"

            if current_chunk:
                chunks.append(current_chunk.strip())

            # Send chunks
            for i, chunk in enumerate(chunks):
                if i == 0:
                    await message.reply(chunk, mention_author=False)
                else:
                    await message.channel.send(chunk)


def run_a2a_server(agent: DemoAgent):
    """Run the A2A server in a separate thread."""
    from beeai_framework.adapters.a2a.serve.server import A2AServer, A2AServerConfig
    from beeai_framework.agents.requirement import RequirementAgent
    from beeai_framework.memory import UnconstrainedMemory
    from beeai_framework.serve.utils import LRUMemoryManager

    # Create agent without MCP tools for A2A (MCP requires async init)
    # The Discord bot will have search capabilities via MCP
    a2a_agent = RequirementAgent(
        llm=agent.llm,
        tools=[],  # No tools - A2A is for conversational requests
        memory=UnconstrainedMemory(),
        instructions="""You are a helpful conversational assistant.
You provide helpful, accurate, and concise responses.
Be friendly and direct.""",
    )

    logger.info(f"Starting A2A server on port {A2A_PORT}")

    A2AServer(
        config=A2AServerConfig(port=A2A_PORT, protocol="jsonrpc"),
        memory_manager=LRUMemoryManager(maxsize=100),
    ).register(
        a2a_agent,
        name=BOT_NAME,
        description="A helpful conversational chatbot",
        send_trajectory=True,
    ).serve()


async def run_discord_bot(bot: BeeAIBot):
    """Run the Discord bot."""
    try:
        await bot.start(DISCORD_TOKEN)
    except discord.LoginFailure:
        logger.error("Invalid Discord token")
        raise
    except Exception as e:
        logger.error(f"Discord bot crashed: {e}", exc_info=True)
        raise


async def main_async():
    """Async main entry point - runs Discord bot, A2A server runs in thread."""
    if not DISCORD_TOKEN:
        logger.error("DISCORD_TOKEN environment variable is required")
        sys.exit(1)

    if not LITELLM_API_KEY:
        logger.error("LITELLM_API_KEY environment variable is required")
        sys.exit(1)

    # Create shared agent instance
    agent = DemoAgent()

    # Start A2A server in background thread if enabled
    if A2A_ENABLED:
        logger.info(f"A2A server enabled on port {A2A_PORT}")
        a2a_thread = threading.Thread(
            target=run_a2a_server,
            args=(agent,),
            daemon=True,
        )
        a2a_thread.start()
    else:
        logger.info("A2A server disabled")

    # Create and run Discord bot
    bot = BeeAIBot(agent=agent)

    try:
        await run_discord_bot(bot)
    except Exception as e:
        logger.error(f"Service crashed: {e}", exc_info=True)
        sys.exit(1)


def main():
    """Main entry point."""
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
