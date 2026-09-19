# Evaluating Ganado Bridge

Version 2026-09-20. Copyright 2026 Ganado International s.r.o., IČO 19322119, Příčná 1892/4, 110 00 Praha 1, Czech Republic. Contact: info@ganado.cz.

## Licence

The Ganado Bridge local agent (the `agent/` directory of this repository and the released `.mcpb` bundles built from it) is licensed under the MIT License; see [LICENSE](LICENSE). You may use, modify, redistribute and sell it under those terms, including for commercial work. Third-party dependencies included in the bundle keep their own licences. Earlier "free evaluation licence" texts (version 2026-09-19) are superseded by MIT for everyone, including existing downloads.

## What you are running

Use only computers, data and accounts you own or are authorized to operate. The agent executes with your OS user's permissions. It is not a sandbox; commands can change or delete data or access the network. Requested tool responses are sent to your AI provider through the connection you configured. Review permissions, avoid sensitive production data and keep backups.

This is experimental, pre-release software supplied as is, with no promised support level, uninterrupted service or suitability for a particular purpose, to the extent permitted by law. There is no time-bomb, remote-disabling mechanism, telemetry, licence-server call, automatic update, hosted relay or payment collection in this build. You stop using it by removing the connection and the software. Ganado is not affiliated with or endorsed by your AI provider.

## First task

In your AI client, ask Bridge to confirm `system_info`, create a new uniquely named text file in a temporary folder, read it, replace exactly one marker using its current SHA-256, read it back and run a harmless print command. Inspect the actual resulting file and the exit code. Do not test with client data or a production directory.
