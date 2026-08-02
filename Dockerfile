# Web (Next standalone) and worker share dependency install.
# LOW uses its own Postgres only — never mount or connect DSD/GSC databases.
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS web
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8082
ENV HOSTNAME=0.0.0.0
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
EXPOSE 8082
CMD ["node", "server.js"]

FROM base AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY worker.js ./
COPY src ./src
CMD ["node", "worker.js"]
