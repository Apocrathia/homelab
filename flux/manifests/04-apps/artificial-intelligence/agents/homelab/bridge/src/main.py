#!/usr/bin/env python3
"""
Discord Bridge for kagent

A thin Discord bot that forwards messages to a kagent declarative agent via A2A.
All intelligence lives in kagent - this is just event plumbing.

Features:
- Multi-turn conversations via A2A contextId
- Message history included for richer context
- Session reset commands (!reset, !clear, !new)
"""

import asyncio
import logging
import os
import sys
from uuid import uuid4

import discord
import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.types import (
    Message,
    Part,
    Role,
    Task,
    TaskArtifactUpdateEvent,
    TaskStatusUpdateEvent,
    TextPart,
)
from a2a.utils.artifact import get_artifact_text
from a2a.utils.message import get_message_text
from discord.ext import commands

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("discord-bridge")

# Environment configuration
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN")
KAGENT_URL = os.environ.get(
    "KAGENT_URL",
    "http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent",
)
BOT_NAME = os.environ.get("BOT_NAME", "Homelab Agent")
HISTORY_LIMIT = int(os.environ.get("HISTORY_LIMIT", "5"))

# Session storage: channel_id -> contextId
channel_contexts: dict[str, str] = {}

MAX_MESSAGE_LENGTH = 1900


def ensure_trailing_slash(url: str) -> str:
    """Ensure URL ends with a trailing slash."""
    return url if url.endswith("/") else url + "/"


def split_by_lines(text: str, max_len: int = MAX_MESSAGE_LENGTH) -> list[str]:
    """Split text into chunks by lines, respecting max length."""
    lines = text.splitlines(keepends=True)
    chunks = []
    current = ""

    for line in lines:
        if len(current) + len(line) > max_len:
            if current:
                chunks.append(current.rstrip())
            current = line
        else:
            current += line

    if current:
        chunks.append(current.rstrip())

    return chunks if chunks else [""]


class DiscordBridge(commands.Bot):
    """Discord bot that bridges messages to kagent via A2A."""

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.messages = True

        super().__init__(
            command_prefix="!",
            intents=intents,
            description=f"{BOT_NAME} - Powered by kagent",
        )

        self.processing_lock = asyncio.Lock()
        self._httpx_client: httpx.AsyncClient | None = None

    async def setup_hook(self):
        """Called when the bot is starting up."""
        logger.info(f"Bot starting up, will connect to kagent at {KAGENT_URL}")
        # Initialize httpx client for A2A communication
        # Longer timeout for multi-agent delegation chains
        self._httpx_client = httpx.AsyncClient(timeout=300.0)

    async def on_ready(self):
        """Called when the bot is ready."""
        logger.info(f"Logged in as {self.user} (ID: {self.user.id})")
        logger.info(f"Connected to {len(self.guilds)} guild(s)")

        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="the homelab",
            )
        )

    async def _get_channel_history(
        self, channel: discord.TextChannel, limit: int = HISTORY_LIMIT
    ) -> str:
        """Fetch recent messages from channel for context."""
        try:
            messages = [msg async for msg in channel.history(limit=limit)]
            messages.reverse()  # Oldest first

            if not messages:
                return ""

            history_lines = []
            for msg in messages:
                # Skip bot's own messages in history context
                if msg.author == self.user:
                    continue
                author = msg.author.display_name
                content = msg.content[:200]  # Truncate long messages
                if len(msg.content) > 200:
                    content += "..."
                history_lines.append(f"{author}: {content}")

            if not history_lines:
                return ""

            return "Recent conversation:\n" + "\n".join(history_lines) + "\n\n"
        except Exception as e:
            logger.warning(f"Failed to fetch channel history: {e}")
            return ""

    async def _call_agent(self, message: str, channel_id: str) -> str:
        """Call the kagent agent via A2A and return the response."""
        # Ensure URL has trailing slash to avoid 301 redirects
        base_url = ensure_trailing_slash(KAGENT_URL)

        # Fetch agent card and create client
        resolver = A2ACardResolver(
            httpx_client=self._httpx_client,
            base_url=base_url,
        )
        agent_card = await resolver.get_agent_card()
        logger.debug(f"Got agent card: {agent_card.name}")

        config = ClientConfig(httpx_client=self._httpx_client)
        client = ClientFactory(config=config).create(card=agent_card)

        # Get existing context for session continuity
        existing_context_id = channel_contexts.get(channel_id)
        if existing_context_id:
            logger.debug(f"Using existing context for channel {channel_id}")

        # Create message with contextId for multi-turn support
        a2a_message = Message(
            message_id=str(uuid4()),
            role=Role.user,
            parts=[Part(root=TextPart(kind="text", text=message))],
            context_id=existing_context_id,
        )

        logger.info(f"Sending to kagent: {message[:50]}...")

        # Collect response text and track contextId
        response_text = []
        new_context_id = None

        try:
            async for event in client.send_message(a2a_message):
                logger.debug(f"A2A event: {type(event).__name__}")

                # Handle Message objects directly
                if isinstance(event, Message):
                    text = get_message_text(event)
                    if text:
                        logger.debug(f"Message text: {text[:100]}...")
                        response_text.append(text)

                # Handle (Task, UpdateEvent) tuples
                elif isinstance(event, tuple) and len(event) >= 2:
                    task, update_event = event[0], event[1]

                    # Extract contextId from task
                    if isinstance(task, Task):
                        task_context = getattr(task, "context_id", None) or getattr(
                            task, "contextId", None
                        )
                        if task_context:
                            new_context_id = task_context
                        elif hasattr(task, "id") and task.id:
                            # Fallback to task ID
                            new_context_id = task.id

                    # TaskArtifactUpdateEvent - extract artifact text
                    if isinstance(update_event, TaskArtifactUpdateEvent):
                        text = get_artifact_text(update_event.artifact)
                        if text:
                            logger.debug(f"Artifact text: {text[:100]}...")
                            response_text.append(text)

                    # TaskStatusUpdateEvent - log important states
                    elif isinstance(update_event, TaskStatusUpdateEvent):
                        state = update_event.status.state
                        if state in ("completed", "failed", "canceled"):
                            logger.info(f"Task {state}")
                        else:
                            logger.debug(f"Task status: {state}")

                    # None update - initial task event, skip
                    elif update_event is None:
                        logger.debug("Initial task event")

                else:
                    logger.warning(f"Unknown event type: {type(event)}")

        except Exception as e:
            logger.error(f"Error calling kagent: {e}", exc_info=True)
            raise

        # Store contextId for session continuity
        if new_context_id:
            logger.debug(f"Storing context for channel {channel_id}")
            channel_contexts[channel_id] = new_context_id

        if response_text:
            return "\n".join(response_text)

        logger.warning("No text extracted from kagent response")
        return "I couldn't generate a response. Please try again."

    async def on_message(self, message: discord.Message):
        """Handle incoming messages."""
        # Ignore own messages
        if message.author == self.user:
            return

        # Ignore DMs
        if not message.guild:
            return

        content = message.content.strip()
        channel_id = str(message.channel.id)

        # Handle session reset commands
        if content.lower() in ["!reset", "!clear", "!new"]:
            if channel_id in channel_contexts:
                del channel_contexts[channel_id]
                await message.reply("Session cleared. Starting fresh.")
                logger.info(f"Session reset for channel {channel_id}")
            else:
                await message.reply("No active session to clear.")
            return

        # Check if we should respond
        should_respond = await self._should_respond(message)

        if should_respond:
            async with self.processing_lock:
                await self._process_message(message)

        await self.process_commands(message)

    async def _should_respond(self, message: discord.Message) -> bool:
        """Determine if the bot should respond to a message."""
        # Always respond to direct mentions
        if self.user.mentioned_in(message):
            return True

        # Check if message is a reply to the bot
        if message.reference:
            try:
                ref_message = await message.channel.fetch_message(
                    message.reference.message_id
                )
                if ref_message.author == self.user:
                    return True
            except discord.NotFound:
                pass

        # Respond to messages starting with ?
        if message.content.strip().startswith("?"):
            return True

        return False

    async def _process_message(self, message: discord.Message):
        """Process a message and generate a response."""
        import time

        start_time = time.monotonic()
        preview = (
            message.content[:50] + "..."
            if len(message.content) > 50
            else message.content
        )
        logger.info(
            f"[Discord->Bridge] Received from {message.author.display_name} "
            f"in #{message.channel.name}: {preview}"
        )

        async with message.channel.typing():
            try:
                # Clean the message content (remove bot mention)
                content = message.content
                if self.user.mentioned_in(message):
                    content = content.replace(f"<@{self.user.id}>", "").strip()
                    content = content.replace(f"<@!{self.user.id}>", "").strip()

                if not content:
                    content = "Hello!"

                # Get channel history for context
                channel_id = str(message.channel.id)
                history = await self._get_channel_history(message.channel)

                # Combine history with current message
                prompt = (
                    history
                    + f"Current message from {message.author.display_name}: {content}"
                )

                logger.info(f"[Bridge->kagent] Sending: {content[:100]}")

                # Call kagent via A2A
                agent_start = time.monotonic()
                response = await self._call_agent(
                    message=prompt,
                    channel_id=channel_id,
                )
                agent_time = time.monotonic() - agent_start
                logger.info(
                    f"[kagent->Bridge] Response received in {agent_time:.2f}s "
                    f"({len(response)} chars)"
                )

                # Send response
                await self._send_response(message, response)

                total_time = time.monotonic() - start_time
                logger.info(
                    f"[Bridge->Discord] Response sent to #{message.channel.name} "
                    f"(total: {total_time:.2f}s)"
                )

            except Exception as e:
                logger.error(f"Error processing message: {e}", exc_info=True)
                await message.reply(
                    "I encountered an error. Please try again.",
                    mention_author=False,
                )

    async def _send_response(self, message: discord.Message, response: str):
        """Send a response, splitting if necessary."""
        if len(response) <= MAX_MESSAGE_LENGTH:
            logger.debug(f"Sending single message ({len(response)} chars)")
            await message.reply(response, mention_author=False)
        else:
            chunks = split_by_lines(response)
            logger.info(f"Splitting response into {len(chunks)} chunks")

            for i, chunk in enumerate(chunks):
                logger.debug(f"Sending chunk {i + 1}/{len(chunks)} ({len(chunk)} chars)")
                if i == 0:
                    await message.reply(chunk, mention_author=False)
                else:
                    await message.channel.send(chunk)

    async def close(self):
        """Clean up resources."""
        if self._httpx_client:
            await self._httpx_client.aclose()
        await super().close()


async def main():
    """Main entry point."""
    if not DISCORD_TOKEN:
        logger.error("DISCORD_TOKEN environment variable is required")
        sys.exit(1)

    bot = DiscordBridge()

    try:
        await bot.start(DISCORD_TOKEN)
    except discord.LoginFailure:
        logger.error("Invalid Discord token")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Bot crashed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
