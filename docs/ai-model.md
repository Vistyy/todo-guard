# AI Model Configuration

Todo Guard validates changes using AI. Choose between Claude Code CLI (default) or Anthropic API.

## Claude Code CLI (Default)

No setup required - uses your existing Claude Code session.

```bash
MODEL_TYPE=claude_cli  # Default, can be omitted
```

If Claude is not found, see the [Claude Binary Configuration](claude-binary.md) guide.

## Anthropic API

Faster validation using direct API access. Requires separate billing from Claude Code.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/)
2. Add to `.env`:

```bash
TODO_GUARD_ANTHROPIC_API_KEY=your_api_key_here
MODEL_TYPE=anthropic_api
```

**Note:** Uses `TODO_GUARD_ANTHROPIC_API_KEY` to avoid conflicts with Claude CLI authentication.

## When to Use Which

**Claude CLI**: Default choice. Free with Claude Code subscription.

**Anthropic API**: Use for CI/CD environments or when you need faster validation.

## Costs

- **Claude CLI**: Included with Claude Code
- **Anthropic API**: Token-based billing ([pricing](https://www.anthropic.com/pricing))
