FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json server.mjs docker-server.mjs LICENSE ./
COPY --chown=node:node public/ ./public/
USER node

# Sender port MUST be published on the host loopback only; see compose.yaml.
EXPOSE 8765 8766
CMD ["node", "docker-server.mjs"]
