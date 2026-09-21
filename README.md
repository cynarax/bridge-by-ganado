<p align="center"><img src="assets/social.png" alt="Ganado Bridge — Chat to done. On your machine." width="100%"></p>

# Ganado Bridge

**Chat to done. On your machine.**

A working connection between your AI workflow and your own computer: real files, checked edits, command sessions and results you can inspect. macOS first.

[Try the local preview](https://ganado-bridge.vercel.app/install?utm_source=github) · [Documentation](https://ganado-bridge.vercel.app/docs) · [Security](https://ganado-bridge.vercel.app/security) · [Release status](https://ganado-bridge.vercel.app/changelog)

Local package metadata is now [active in the MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cynarax%2Fbridge-by-ganado/versions/0.1.0-preview.2). This is separate from the ChatGPT and desktop-extension directories; neither marketplace approval is claimed.

## Why we are building it

Copying terminal output between a computer and an AI assistant is not the interesting part of a task. Bridge gives the assistant tools to read the current file, compare its hash before changing it, run a command once and inspect its actual exit code.

## What exists today

- A public product website and free early-access list.
- A downloadable free local evaluation bundle: 13 MCP tools, bundled dependencies, checked file operations, process polling, built-in bounded search and explicit opt-in local access.
- 27 local agent tests plus real distributed-archive MCP acceptance on separate macOS and Ubuntu runners. The tests do not certify every desktop-client UI or represent a customer activation.

This repository holds the **agent source (`agent/`, MIT licence since 20 September 2026), the documentation, releases and feedback hub**. Download the exact [0.2.0-preview.0 preview bundle](https://github.com/cynarax/bridge-by-ganado/releases/tag/v0.2.0-preview.0), verify its [SHA-256](SHA256SUMS), and read [INSTALL.md](INSTALL.md) and [EVALUATION.md](EVALUATION.md) before enabling access. No signup or payment is required for the local evaluation.

## Managed relay technical preview

The managed HTTPS relay is now running as a technical preview and the 0.2 agent branch contains the outbound `connect`/`disconnect` client. A production synthetic round trip has passed on an authorized maintainer Mac. This is **not** a public ChatGPT directory approval, independent-user activation or paid managed service. The 0.2 reviewer bundle includes the outbound managed-relay client while preserving local-only MCP mode. Windows and Linux are not supported release claims.

## Practical guides

New: [Cursor local MCP setup on Mac](https://ganado-bridge.vercel.app/guides/cursor-local-files-mcp-mac?utm_source=github), [disconnected-server troubleshooting](https://ganado-bridge.vercel.app/guides/mcp-server-disconnected-macos?utm_source=github), and [local vs remote MCP](https://ganado-bridge.vercel.app/guides/local-vs-remote-mcp?utm_source=github). See [GUIDES.md](GUIDES.md) for the specific problem each guide addresses.

The code is MIT, so commercial use needs no purchase. The earlier EUR 29 one-time "commercial licence" is being reworked into something that adds value beyond the code (checkout is paused meanwhile); see [the licence page](https://ganado-bridge.vercel.app/licence?utm_source=github) for the current state. The future managed connection remains an interest list.

## A useful task has evidence

| Step | What should happen |
|---|---|
| Read | Inspect the current file, not a remembered snippet. |
| Change | Reject a stale hash or an ambiguous replacement. |
| Execute | Start a command once and poll the returned session. |
| Verify | Return actual output, exit status and any limitations. |

[Checked AI file edits](https://ganado-bridge.vercel.app/guides/checked-ai-file-edits?utm_source=github) · [Verifying AI terminal work](https://ganado-bridge.vercel.app/guides/verify-ai-terminal-work?utm_source=github)

## Understand the boundary

Bridge runs with the operating-system user's existing access. It is **not a sandbox**; commands can modify or delete data. Requested file contents and command output can be sent to your AI provider through the configured transport. The machine must be awake and connected; process sessions do not survive an agent restart.

The public website has no connection to the founder's computer or your computer. The private owner deployment is not offered as a shared customer endpoint.

## Privacy

In local-only stdio mode, the agent has no Ganado telemetry, account or licence check. If you explicitly run the 0.2 `connect` command, the agent creates a device identity and contacts the Ganado Bridge HTTPS relay for pairing and outbound job polling. Relayed tool arguments/results are encrypted before short-lived queue persistence, while the live relay still receives MCP requests from the AI client and routing metadata remains service-visible. File contents, images, paths and command output requested by your AI assistant can be sent through the configured AI/relay transport. Metadata-only audit records (tool name, result, timing; never contents, commands or credentials) are kept locally under `~/.local/state/ganado-bridge-agent` and can be deleted at any time. The website's privacy notice, including what the early-access form and the purchase flow store, is at https://ganado-bridge.vercel.app/privacy. Questions: info@ganado.cz.

## Feedback that helps

Open a workflow request describing the task you repeat, the step where your current AI setup fails and what a useful verified result would look like. After trying the bundle, optionally use the first-task report form; download counts and automated selftests are not counted as verified customer activations. Please do not include credentials, private documents or unredacted command logs. For a security concern, email info@ganado.cz instead of opening a public issue.

Built by Ganado International s.r.o., Czech Republic. Independent of OpenAI; no endorsement or directory approval claimed.
