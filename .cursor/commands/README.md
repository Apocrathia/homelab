# `.cursor/commands/` — Slash commands

Cursor slash commands defined as markdown files. Invoked by the user via `/command-name` in chat.

## File convention

```
.cursor/commands/<command-name>.md
```

Each file starts with frontmatter:

```yaml
---
description: One-line description of what the command does
---
```

The body of the file is the prompt that runs when the command is invoked.

## Current commands

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `/commit-message` | Generate a conventional commit message for staged changes |

## Adding a command

1. Create `<command-name>.md` with `description:` frontmatter.
2. Write the prompt body — be explicit about inputs, outputs, and constraints.
3. Add a row to the table above.
