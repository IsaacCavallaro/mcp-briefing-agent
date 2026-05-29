# Threat Model

## Assets

- model API keys in `.env`
- local run artifacts under `runs/`
- briefing source documents exposed through MCP
- generated briefing output

## Trust Boundaries

- CLI or HTTP caller to agent runtime
- agent runtime to model provider
- agent runtime to MCP server over stdio
- MCP server to briefing library

## Current Controls

- mock mode is the default for HTTP requests
- live mode requires explicit opt-in
- `.env` and generated run artifacts are ignored by Git
- the MCP server exposes only two constrained tools and one catalog resource
- tool inputs are validated by the MCP SDK and `zod`

## Known Gaps

- the HTTP wrapper has no authentication because it is meant for local demos
- saved run artifacts may contain user-provided topics and generated text
- live provider calls depend on external model-provider data handling

## Portfolio-Safe Usage

Run the service on localhost, avoid putting secrets in committed files, and keep generated `runs/` content out of Git. For public demos, use mock mode.
