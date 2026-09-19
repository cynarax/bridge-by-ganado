# Practical local MCP guides

Written by Ganado, the developer of Bridge. These guides address a specific setup or failure; they are not claims that every client or platform has been tested.

## Configure Cursor on a Mac

[Connect Cursor to local Mac files with MCP](https://ganado-bridge.vercel.app/guides/cursor-local-files-mcp-mac?utm_source=github)

Start with the absolute Node path and an explicit `stdio` configuration. Preserve existing servers, use the local agent command rather than a website URL, and verify one disposable file change and actual command exit. The sample config is checked; your client installation still needs its own acceptance.

## Diagnose a disconnected local server

[MCP server disconnected on macOS: diagnostic checklist](https://ganado-bridge.vercel.app/guides/mcp-server-disconnected-macos?utm_source=github)

Separate executable launch, runtime/configuration, protocol output and tool-level errors. A stale hash is not a transport problem. A successful process start is not a completed task. Avoid changing multiple variables or widening permissions to hide a symptom.

## Choose local versus remote deliberately

[Local vs remote MCP: where does the work run?](https://ganado-bridge.vercel.app/guides/local-vs-remote-mcp?utm_source=github)

Check the actual execution host and data path before asking for file access. A local package, a public registry entry and an approved ChatGPT connection are different things. Bridge's current downloadable release is a local evaluation, not a managed remote service.

## Evaluate the published package

Use [INSTALL.md](INSTALL.md), verify [SHA256SUMS](SHA256SUMS), read [EVALUATION.md](EVALUATION.md), and try one disposable first task. A voluntary [first-task report](https://github.com/cynarax/bridge-by-ganado/issues/new?template=activation.yml) helps identify the first real failure. The report is public: omit personal paths, credentials, file contents and customer data.

[All guides](https://ganado-bridge.vercel.app/guides?utm_source=github) · [Atom feed](https://ganado-bridge.vercel.app/feed.xml) · [Commercial licence and current availability](https://ganado-bridge.vercel.app/licence?utm_source=github)
