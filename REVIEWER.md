# Ganado Bridge 0.2 managed-relay reviewer path

This is a technical preview for review, not a public ChatGPT-directory approval.

## Disposable review environment

Use a Mac and files created only for this review. Do not use Ganado customer data, the maintainer's private tunnel, or a production project.

1. Download the versioned `ganado-bridge-0.2.0-preview.0.mcpb` and verify it against `SHA256SUMS`.
2. Treat the MCPB as a ZIP and extract it to a temporary folder. With Node 22.22+ or 24 installed, run `node bin/bridge.mjs doctor` and `node bin/bridge.mjs selftest`.
3. Run `node bin/bridge.mjs connect`. The command creates a private local device identity, registers only its public key, prints a 10-minute pairing code, and keeps an outbound HTTPS poll running.
4. Add the reviewer MCP endpoint `https://ganado-bridge.vercel.app/mcp` in the supported ChatGPT/plugin review flow. Complete OAuth/PKCE and enter the pairing code in the Ganado Bridge authorization page.
5. Use only a disposable directory. Verify `system_info`, create/read/checked-edit/read a fixture, start one harmless command and poll its real exit code.
6. Negative checks: an old file hash must fail; an unconfigured SSH alias must fail; after `node bin/bridge.mjs disconnect`, the revoked device must not accept further relay jobs.
7. Delete the temporary extraction and local Bridge state after the review if it is no longer needed.

The Mac opens no inbound listener. Relay queue payloads are encrypted to the paired device; routing metadata remains service-visible. The live relay receives MCP requests in memory. See the website privacy/security notices for the complete boundary.
