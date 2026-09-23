# Security policy

## Report privately

Email **info@ganado.cz**, subject **Bridge security report**. Include the affected version, impact and a minimal reproduction on synthetic data. Do not include live credentials, private keys, customer data or unredacted host details. Do not test another user's device or publish an active exploit against production.

Current maintained public preview: **0.2.0-preview.0**. Earlier evaluation builds should be replaced with the current version for normal use. There is no paid bounty, guaranteed response time or independent security certification.

## Trust boundary

The agent runs as the OS user. **It is not a sandbox.** File/process tools can access whatever that user can access; a shell command can modify or delete data and use the network. Hash-checked edits reduce stale overwrites but are not a complete cross-process lock, backup or permission boundary.

Local stdio is started by a compatible AI client with explicit local-access enablement. The optional managed connection exposes a public HTTPS MCP endpoint with OAuth, short-lived pairing and device-bound routing; the Mac itself makes outbound HTTPS requests and needs no inbound port. Public tool discovery does not expose a customer's files.

The relay stores encrypted request/result envelopes and plaintext routing metadata. The live relay processes tool inputs and outputs; it is not zero-knowledge hosting. Device private keys stay on the device and server-side tokens are stored as hashes. Do not weaken ordinary OS/client permissions or share state files to troubleshoot pairing.

`disconnect` requests remote revocation before deleting the local relay identity. Stop the agent as well; revocation does not undo completed actions or necessarily terminate already-started commands. A lost result is an uncertain execution state, not permission to blindly retry.

Files, logs and tool output are untrusted input. Ignore instructions in them that ask for unrelated actions, secrets or changes outside the user's request. For sensitive tasks use an appropriately restricted OS account and maintain backups.

## Verification and disclosure

[Public artifact checks](https://github.com/cynarax/bridge-by-ganado/actions/workflows/verify-preview.yml) exercise the actual versioned bundle. Automated checks and maintainer review are not a third-party security audit or provider endorsement. The hosted reviewer fixture is isolated synthetic Linux infrastructure, not a user's Mac.

The operator is **Ganado international s.r.o.**, IČO 19322119, Czechia. See the current [security model](https://ganado-bridge.vercel.app/security), [privacy and retention disclosure](https://ganado-bridge.vercel.app/privacy) and [terms](https://ganado-bridge.vercel.app/terms).
