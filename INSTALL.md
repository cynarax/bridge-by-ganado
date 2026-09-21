# Ganado Bridge — free local evaluation preview

13 MCP tools for checked file edits, bounded reads/search and persistent command polling. macOS first. No hosted relay or public ChatGPT connection is included. Read EVALUATION.md before use.

## Install a desktop bundle

Download the versioned .mcpb from https://github.com/cynarax/bridge-by-ganado/releases and verify its SHA-256 against the release checksum. Open it in a desktop MCP host that supports .mcpb installation. Review the extension details, then explicitly enable the owner-level local-access setting. The default is disabled. Your host's normal tool approvals and OS permissions still apply.

Dependencies are bundled. No npm install or Homebrew/ripgrep installation is required for the MCPB route. The host supplies a supported Node runtime. Current runtime range is Node 22.22+ within 22.x, or 24.x. Host UI installation is separate from the automated manifest-resolved MCP tests; see release evidence.

## Other local MCP clients

Extract the versioned .mcpb as a ZIP into a folder you control. With a supported Node installed, run:

```sh
node bin/bridge.mjs doctor
node bin/bridge.mjs selftest
node bin/bridge.mjs config
```

The config command prints a stdio connection using your own machine's paths. Review it before adding it to a compatible client. It does not write client settings or enable a service. Starting stdio directly requires serve --allow-local-access. The files-and-process selftest uses disposable fixtures; a passing result is not a customer activation or AI-provider endorsement.


## Managed relay reviewer path

For the 0.2 preview, extract the versioned MCPB into a temporary folder and run `node bin/bridge.mjs connect`. It prints a short-lived pairing code and keeps an outbound HTTPS poll running. Pair that code only in the Ganado Bridge authorization flow for `https://ganado-bridge.vercel.app/mcp`. Use `node bin/bridge.mjs disconnect` to revoke the paired device before deleting local state. See `REVIEWER.md` in the repository for the disposable review checklist. The public ChatGPT listing is not approved.

## What access means

This is not a sandbox. Shell tools run as your OS user and can modify/delete data and access the network. Read-only annotations apply only to particular tools, not to the entire process. File contents, images, paths and command output requested by your AI assistant are sent to that assistant through your chosen connection.

SSH is disabled by default. Only explicitly configured, existing authorized aliases from BRIDGE_AGENT_SSH_ALIASES may be used. The private owner operations-health module is not included.

Built-in search has entry, byte, file-size, depth and time budgets. Budget-limited results are marked incomplete. Ripgrep is optional acceleration, not an installation dependency.

## First task

In your AI client, ask Bridge to confirm system_info, create a new uniquely named text fixture in a temporary folder, read it, replace exactly one marker using its current SHA-256, read it back and run a harmless print command. Inspect the actual resulting file and exit code. Do not test with client data or a production directory.

## Removal and data

Disable/remove the extension in the host and stop its host-managed process, then delete its extracted folder. No LaunchAgent, global package, automatic startup, billing or telemetry is installed. Metadata-only audit logs may remain under ~/.local/state/ganado-bridge-agent; remove them separately if not needed. Command output exists in bounded in-memory buffers and is lost on restart.

You may voluntarily report a redacted first-task result through the public workflow issue on GitHub. Do not include paths, hostname, credentials, customer data or raw logs. Download counts are not activation counts.

Security/privacy/terms: https://ganado-bridge.vercel.app/security · https://ganado-bridge.vercel.app/privacy · https://ganado-bridge.vercel.app/terms
