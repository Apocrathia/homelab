#!/usr/bin/env python3
"""
CrewAI Discord Agent

A Discord bot powered by CrewAI that can participate in conversations
and perform web searches via SearXNG MCP server.

Also exposes an A2A (Agent-to-Agent) protocol endpoint for other agents to invoke.
"""

import asyncio
import logging
import os
import random
import sys
from typing import Optional

import discord
from discord.ext import commands

from a2a_server import A2AServer
from crew import DemoCrew

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("crewai")

# Environment configuration
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN")
LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://litellm.litellm.svc.cluster.local:4000")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY")

# Bot configuration
BOT_NAME = os.environ.get("BOT_NAME", "CrewAI Demo")
RESPONSE_CHANCE = float(os.environ.get("RESPONSE_CHANCE", "0.3"))  # Chance to respond unprompted

# A2A server configuration
A2A_PORT = int(os.environ.get("A2A_PORT", "10001"))
A2A_ENABLED = os.environ.get("A2A_ENABLED", "true").lower() == "true"


class CrewAIBot(commands.Bot):
    """Discord bot with CrewAI integration."""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.messages = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            description=f"{BOT_NAME} - A helpful chatbot that doesn't hold back",
        )

        self.crew = DemoCrew(
            litellm_base_url=LITELLM_BASE_URL,
            litellm_api_key=LITELLM_API_KEY,
        )
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
        # Always respond to direct mentions
        if self.user.mentioned_in(message):
            return True

        # Check if message is a reply to the bot
        if message.reference:
            try:
                ref_message = await message.channel.fetch_message(message.reference.message_id)
                if ref_message.author == self.user:
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
            "?",  # Questions
        ]

        # Check if message contains trigger phrases
        if any(trigger in content_lower for trigger in triggers):
            logger.info(f"Trigger matched in message: {message.content[:50]}...")
            relevant = await self._check_relevance(message.content)
            logger.info(f"Relevance check result: {relevant}")
            return relevant

        # Random chance to check any message
        if random.random() < RESPONSE_CHANCE:
            logger.info(f"Random sampling message: {message.content[:50]}...")
            return await self._check_relevance(message.content)

        return False

    async def _check_relevance(self, content: str) -> bool:
        """Use the crew to check if content is relevant."""
        try:
            result = await asyncio.to_thread(
                self.crew.check_relevance,
                content,
            )
            return result
        except Exception as e:
            logger.error(f"Error checking relevance: {e}")
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

                # Run the crew
                logger.info(f"Processing request from {message.author}: {content[:100]}...")
                result = await asyncio.to_thread(
                    self.crew.process_request,
                    user_message=content,
                    context=context,
                    user_name=message.author.display_name,
                )

                # Send response (split if too long)
                await self._send_response(message, result)

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
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


async def run_discord_bot(bot: CrewAIBot):
    """Run the Discord bot."""
    try:
        await bot.start(DISCORD_TOKEN)
    except discord.LoginFailure:
        logger.error("Invalid Discord token")
        raise
    except Exception as e:
        logger.error(f"Discord bot crashed: {e}", exc_info=True)
        raise


async def run_a2a_server(crew: DemoCrew):
    """Run the A2A server."""
    server = A2AServer(crew=crew, port=A2A_PORT)
    await server.start()


async def main_async():
    """Async main entry point - runs both Discord bot and A2A server."""
    if not DISCORD_TOKEN:
        logger.error("DISCORD_TOKEN environment variable is required")
        sys.exit(1)

    if not LITELLM_API_KEY:
        logger.error("LITELLM_API_KEY environment variable is required")
        sys.exit(1)

    # Create shared crew instance
    crew = DemoCrew(
        litellm_base_url=LITELLM_BASE_URL,
        litellm_api_key=LITELLM_API_KEY,
    )

    # Create Discord bot with the shared crew
    bot = CrewAIBot()
    bot.crew = crew  # Replace the auto-created crew with shared instance

    # Build task list
    tasks = [run_discord_bot(bot)]

    if A2A_ENABLED:
        logger.info(f"A2A server enabled on port {A2A_PORT}")
        tasks.append(run_a2a_server(crew))
    else:
        logger.info("A2A server disabled")

    # Run both concurrently
    try:
        await asyncio.gather(*tasks)
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
