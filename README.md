<p align="center"><img src="assets/social.png" alt="Ganado Bridge — Chat to done. On your machine." width="100%"></p>

# Ganado Bridge

**Chat to done. On your machine.**

A working connection between your AI workflow and your own computer: real files, checked edits, command sessions and results you can inspect. macOS first.

[Request early access](https://ganado-bridge.vercel.app/?utm_source=github) · [Documentation](https://ganado-bridge.vercel.app/docs) · [Security](https://ganado-bridge.vercel.app/security) · [Release status](https://ganado-bridge.vercel.app/changelog)

## Why we are building it

Copying terminal output between a computer and an AI assistant is not the interesting part of a task. Bridge gives the assistant tools to read the current file, compare its hash before changing it, run a command once and inspect its actual exit code.

## What exists today

- A public product website and free early-access list.
- A private local agent evaluation build: 13 MCP tools, checked file operations, process polling and explicit SSH configuration.
- Automated local tests and a real synthetic MCP round trip.

This repository is the **public product documentation and feedback hub**, not the agent source or a public installable release. The local evaluation build is not currently distributed here.

## What is not shipping yet

A generally available self-serve customer connection, paid plan and public ChatGPT directory listing. €19/month is a target price, not an active offer. No payment is taken when joining the list. Windows and Linux are interest-list options, not supported release claims.

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

## Feedback that helps

Open a workflow request describing the task you repeat, the step where your current AI setup fails and what a useful verified result would look like. Please do not include credentials, private documents or unredacted command logs. For a security concern, email info@ganado.cz instead of opening a public issue.

Built by Ganado International s.r.o., Czech Republic. Independent of OpenAI; no endorsement or directory approval claimed.
