FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=8788

COPY package.json package-lock.json ./
COPY public ./public
COPY functions ./functions
COPY scripts ./scripts

EXPOSE 8788

CMD ["node", "scripts/dev-server.mjs"]
