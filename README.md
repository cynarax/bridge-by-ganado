<p align="center"><img src="assets/brand-icon.png" alt="Ganado Bridge" width="88" height="88"></p>

# Ganado Bridge

**Let ChatGPT work on your Mac.**

Read the project file. Make the requested change. Run a check and inspect the actual result—without constantly copying files and terminal output into chat.

[Set up on your Mac](https://ganado-bridge.vercel.app/install?utm_source=github) · [How access works](SECURITY.md) · [Release status](RELEASE_STATUS.md) · [Get help](SUPPORT.md)

**Current release: 0.2.0-preview.0. Free MIT local agent; free hosted technical preview.** The OpenAI listing for version 0.2.0 was submitted on 22 September 2026 and was last observed in **Review** on 23 September. It is **not approved or published** in the ChatGPT directory.

## Choose your connection

| You use | Setup | What stays on your Mac |
|---|---|---|
| ChatGPT with Developer Mode access | Download the agent, run `node bin/bridge.mjs connect`, then pair its short-lived code in the OAuth page | The agent and your files; the Mac must remain awake and connected |
| A desktop AI client with local MCP support | Import the `.mcpb`, or use the generated stdio configuration | The local tool server; your client handles the AI conversation |

ChatGPT plan and workspace eligibility are separate. Bridge requires no AI API key or purchase. It is not a chatbot, a hosted computer or a graphical remote-desktop stream. See the [complete installation instructions](INSTALL.md) before enabling file and terminal access.

## A useful first task

Start in a disposable folder. Ask Bridge to read a text file, change one marker using the file's current hash, read it back and run a harmless print command. You can inspect both the changed file and the real exit code. Once that works, use the same read → change → check workflow on a project you are authorized to operate.

The 13 tools cover file information, directory listing, bounded reads, hash-checked writes and edits, literal search, image viewing, and process start/read/input/stop/list. SSH is available only through process calls targeting an alias you explicitly configure; no remote host is enabled by default.

## Know the access you grant

**Owner-level access, not a sandbox.** Shell commands can modify or delete data and use the network with your OS user's privileges. Checked edits reduce accidental stale writes; they are not a backup or a restriction on shell commands. Keep backups and review important actions.

In local-only mode the agent has no Ganado account, usage telemetry or licence check. The optional `connect` mode contacts Ganado's authenticated HTTPS relay. Requested file content and command output are sent to your AI client. Relay queue envelopes are encrypted, but the live relay processes the request and response—this is **not zero-knowledge hosting**. Read [Security](SECURITY.md) and the [privacy disclosure](https://ganado-bridge.vercel.app/privacy).

`Ctrl-C` stops the live connection. `node bin/bridge.mjs disconnect` revokes the device before removing its local identity. Revocation does not undo past edits or guarantee that an already-running command has stopped. After an uncertain timeout, inspect state before repeating a write or command.

## Verify the build

Download the [versioned 0.2 bundle](https://github.com/cynarax/bridge-by-ganado/releases/tag/v0.2.0-preview.0), check [SHA256SUMS](SHA256SUMS), and review the [public artifact acceptance run](https://github.com/cynarax/bridge-by-ganado/actions/runs/35576354917). Automated archive tests passed on macOS and Ubuntu; macOS remains the primary supported preview. Those tests do not establish a notarized native app, every desktop-client UI, independent customer adoption or a security certification.

The released ZIP is immutable. Current source documentation can be newer than the documentation inside that ZIP; the current [MIT licence](LICENSE) also applies to earlier evaluation downloads. See [Release status](RELEASE_STATUS.md) for the exact boundary.

## Built by a Czech company

**Ganado international s.r.o.** · IČO **19322119** · Příčná 1892/4, Nové Město, 110 00 Praha 1, Czechia. [Official ARES company record](https://ares.gov.cz/ekonomicke-subjekty/res/19322119) · [About the publisher](https://ganado-bridge.vercel.app/about).

The company was incorporated in 2023; Bridge was first released in September 2026. The local agent source in `agent/` is MIT-licensed. The hosted relay is a separate service. We are independent of OpenAI and other AI providers; no endorsement, enterprise certification or support SLA is claimed.

## Feedback and contribution

[Report a non-sensitive bug](https://github.com/cynarax/bridge-by-ganado/issues/new?template=bug.yml) or [describe a workflow](https://github.com/cynarax/bridge-by-ganado/issues/new?template=workflow.yml). First-task reports are optional. Do not publish private paths, codes, credentials or customer logs. For security issues, email **info@ganado.cz** privately with the subject **Bridge security report**.

[Contributing](CONTRIBUTING.md) · [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md) · [MIT licence](LICENSE)
