# Set up Ganado Bridge on your Mac

Current bundle: **0.2.0-preview.0**. Two supported preview routes: a local MCP client, or the hosted ChatGPT Developer Mode connection. A public ChatGPT directory listing is under review, not yet approved or published.

## Before starting

Use a Mac and files you are authorized to operate. Manual setup requires **Node 22.22+ within 22.x, or 24.x**. A compatible MCPB desktop host supplies its own supported runtime. The bundle includes dependencies; you do not need a separate npm, Homebrew or ripgrep installation for the bundle route.

Download the versioned `.mcpb` and `SHA256SUMS` from the [0.2 release](https://github.com/cynarax/bridge-by-ganado/releases/tag/v0.2.0-preview.0). In the download folder, verify:

```sh
shasum -a 256 -c SHA256SUMS
```

Do not continue if the checksum fails. This is a ZIP-format MCP bundle, **not a notarized `.dmg` app**. Do not disable Gatekeeper or other client/OS security controls to run it. The [MIT licence](LICENSE) applies to the agent; dependencies keep their own licences.

## Route A: ChatGPT → your Mac

1. Extract the `.mcpb` as a ZIP into a folder you control. For example, run `unzip ganado-bridge-0.2.0-preview.0.mcpb -d ganado-bridge-preview` from its download folder.
2. Open Terminal in the extracted folder and run:

   ```sh
   node bin/bridge.mjs doctor
   node bin/bridge.mjs connect
   ```

3. Keep the process running. It displays a pairing code valid for 10 minutes. Creating this connection enables the agent to handle owner-authorized file and terminal requests; read [Security](SECURITY.md) first.
4. In a ChatGPT account that permits Developer Mode, create a remote MCP connection with **OAuth** and the MCP URL:

   ```text
   https://ganado-bridge.vercel.app/mcp
   ```

5. Enter the code **only on the Ganado Bridge authorization page**, not in chat, GitHub or a support message. Review the access and confirm.
6. Select the connection in ChatGPT and try the disposable first task below. The correct Mac must stay awake, online and running Bridge.

[Current OpenAI connection documentation](https://developers.openai.com/plugins/deploy/connect-chatgpt). Account/workspace eligibility can differ; the public directory is not an alternative until our listing is approved and published.

## Route B: a local desktop AI client

For an MCPB-capable client, import the downloaded bundle through its normal extension UI. Review the publisher and tools. The `Enable owner-level local file and terminal access` setting starts disabled; enable it only after understanding the permission boundary. Client tool approvals and OS permissions still apply.

For Cursor or another stdio client, extract the same bundle and run:

```sh
node bin/bridge.mjs doctor
node bin/bridge.mjs selftest
node bin/bridge.mjs config
```

`config` prints settings with your own absolute file paths; review and add them to your client. It does not edit your client configuration. Direct stdio use requires `serve --allow-local-access`. [Cursor setup guide](https://ganado-bridge.vercel.app/guides/cursor-local-files-mcp-mac).

## First task: create → read → checked edit → verify

```text
Use Ganado Bridge to identify the connected device.
Create a uniquely named folder under the operating system's temporary directory.
Inside it create fixture.txt containing BRIDGE_BEFORE.
Read the file, use its current SHA-256 to replace that marker with BRIDGE_AFTER,
and read it back. Run a harmless printf command in the same folder.
Wait for that same process session to finish and report its actual exit code.
Do not inspect unrelated files or private data.
```

Inspect the changed file and result yourself. A checksum, selftest, running process or download counter is not proof that your AI client completed the task.

## Disconnect and uninstall

For the hosted route, stop the active connection with `Ctrl-C`, then from the extracted folder run:

```sh
node bin/bridge.mjs disconnect
```

Wait for confirmed revocation before deleting local state. If it fails, keep the state so you can retry. A disconnect prevents future work; it cannot roll back a completed action or guarantee shutdown of an already-started remote process.

For local mode, remove/disable the extension in the AI client and stop its process. Remove the extracted folder when no longer needed. This preview installs no automatic startup service, LaunchAgent or global package.

Local metadata-only audit logs and relay identity can remain under `~/.local/state/ganado-bridge-agent`. The identity contains credentials: never attach it to a bug report. Remove state only after hosted revocation is confirmed. Command sessions and their bounded output buffers do not survive an agent restart.

## When something fails

Use the [support checklist](SUPPORT.md). Do not repeatedly rerun a timed-out write or command: it may already have started. Read the current file or poll the existing process first. An unknown SSH alias is intentionally rejected; only explicitly configured authorized aliases in `BRIDGE_AGENT_SSH_ALIASES` are accepted.
