# Changelog

## 0.1 — early-access website, 19 September 2026

Published the Ganado Bridge brand and English website, interactive illustrative workflows, macOS-first early-access form, documentation, security/privacy/terms pages and two practical guides.

Website checks: 48 automated tests; browser checks at 320, 390, 768 and 1440 pixels. Production signup was tested with a synthetic address, checked in the database and excluded from demand metrics. These checks establish the website path, not product-market fit or general device compatibility.

Private agent preview: 13 tools, 10 automated tests and eight synthetic MCP acceptance outcomes. Public customer connectivity and directory publication remain release gates.

## 0.1.0-preview.2 — free local evaluation, 19 September 2026

Published a versioned MCPB with dependencies, a disabled-by-default local-access setting, built-in bounded search, explicit evaluation terms and removal instructions. No ripgrep or package installation is required for the bundle route; the supporting MCP host supplies a compatible Node runtime.

The exact public artifact passed hash, consent, real file edit/readback, no-ripgrep search, process, unauthorized-target and cleanup checks on an independent macOS runner and Ubuntu runner: https://github.com/cynarax/bridge-by-ganado/actions/runs/35470640062 . This is automated archive-level acceptance, not a desktop-client UI installation or a customer activation. macOS remains the first supported evaluation target.

The earlier draft-only download check failed because the read-only CI identity could not see the draft. The published artifact check above is a separate successful run.

MCP Registry publication completed at 21:33:56 UTC on 19 September 2026 and was read back as active for the exact artifact/hash: https://registry.modelcontextprotocol.io/v0.1/servers/io.github.cynarax%2Fbridge-by-ganado/versions/0.1.0-preview.2 . Publication receipt: https://github.com/cynarax/bridge-by-ganado/actions/runs/35470782403 . This is not an OpenAI directory listing.
