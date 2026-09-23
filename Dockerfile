# Local stdio evaluation for directory introspection. No host data or relay pairing.
FROM node:24-bookworm-slim
WORKDIR /opt/bridge
COPY agent/package.json agent/npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts --omit=dev --no-audit --no-fund \
 && mkdir /workspace \
 && chown node:node /workspace
COPY agent/bin ./bin
COPY agent/src ./src
COPY agent/README.md agent/EVALUATION.md ./
COPY LICENSE ./LICENSE
USER node
ENV HOME=/home/node BRIDGE_AGENT_STATE_DIR=/tmp/ganado-bridge-evaluation BRIDGE_AGENT_AUDIT=off
WORKDIR /workspace
CMD ["node", "/opt/bridge/bin/bridge.mjs", "serve", "--allow-local-access"]
