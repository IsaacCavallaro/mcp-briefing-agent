# MCP Briefing Agent

`mcp-briefing-agent` is a compact TypeScript repo for generating structured briefings with:

- OpenAI Responses API, Gemini, or an OpenAI-compatible provider for agentic reasoning
- MCP server for context and tool boundaries
- Lightweight eval harness for repeatable output checks
- Clean CLI workflow for local runs and quick iteration

This is not another generic chatbot. It is a small, reviewable system that demonstrates how to compose model reasoning, tool use, and protocol-driven context into one coherent app.

## Architecture

```text
user prompt
   |
   v
CLI command
   |
   v
Model API loop
   |
   +--> function tool: search_library ------+
   |                                        |
   +--> function tool: read_briefing        |
                                            v
                                   MCP client over stdio
                                            |
                                            v
                                     local MCP server
                                            |
                                            v
                                      briefing library
```

The model never reaches directly into the data layer. It reasons over tool results, while the MCP server owns the context surface.

## Repo Layout

```text
src/
  briefing/
    agent.ts        # Model loop for OpenAI, Gemini, and mock mode
    library.ts      # Sample briefing corpus and search logic
    types.ts        # Shared domain types
  evals/
    dataset.ts      # Scenario fixtures
    run.ts          # Lightweight evaluation runner
  mcp/
    client.ts       # Stdio MCP client wrapper
    server.ts       # Local MCP server exposing tools/resources
  cli.ts            # CLI entrypoint
docs/
```

## Quickstart

1. Install dependencies.

```bash
npm install
```

2. Copy the environment file.

```bash
cp .env.example .env
```

3. Configure a provider in `.env`.

Gemini free-tier setup:

```env
MODEL_PROVIDER=gemini
MODEL_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-2.5-flash-lite
```

4. Run a live briefing.

```bash
npm run brief -- --topic "How remote MCP servers change internal tooling" --audience "engineering manager" --live
```

5. Run the eval harness.

```bash
npm run eval
```

If `--live` is not used, the repo falls back to deterministic mock mode so the architecture is still demoable without secrets.

## Provider Configuration

The project supports:

- `MODEL_PROVIDER=gemini`
- `MODEL_PROVIDER=openai`
- `MODEL_PROVIDER=openai-compatible`

Gemini setup:

```env
MODEL_PROVIDER=gemini
MODEL_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-2.5-flash-lite
```

For Gemini, `MODEL_BASE_URL` is optional. If it is not set, the repo uses the Google OpenAI-compatible endpoint automatically.

OpenAI setup:

```env
MODEL_PROVIDER=openai
MODEL_API_KEY=your_api_key
MODEL_NAME=gpt-5
```

OpenAI-compatible setup:

```env
MODEL_PROVIDER=openai-compatible
MODEL_BASE_URL=http://localhost:11434/v1
MODEL_API_KEY=local
MODEL_NAME=your-model-name
```

The second option is useful for local or free models exposed through an OpenAI-compatible endpoint.

## Commands

```bash
npm run brief -- --topic "Why evals matter for agent apps"
npm run catalog
npm run mcp
npm run eval
npm run test
npm run build
npm start         # run the compiled CLI after build
```

## Example Output Shape

The agent returns markdown with a stable structure:

- Executive summary
- Why this matters now
- Key signals
- Risks and unknowns
- Suggested next moves
- Source notes

That makes it easy to score in the eval script and compare outputs across runs.

## Next Extensions

- swap the in-memory briefing library for Notion, GitHub, or Jira ingestion
- add trace logging and saved runs
- add a second evaluator for citation quality and actionability
- expose the MCP server remotely instead of over stdio
