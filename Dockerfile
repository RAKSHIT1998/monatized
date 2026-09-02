# Production image. Three stages: install deps once, build with Prisma
# Client generated against the real schema, then copy only the standalone
# server output into a minimal runtime — never the full node_modules tree
# or dev dependencies (Playwright, vitest, source maps, etc).
#
# IMPORTANT — DATABASE_URL must be reachable at BUILD time, not just
# runtime: `next build` statically prerenders the landing page ("/"), which
# queries the Plan table directly. Point --build-arg DATABASE_URL at a real,
# migrated (`prisma migrate deploy`) database before building this image —
# see the "Deploying" section of README.md.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# The local storage driver writes uploads under /app/storage. The runner
# stage runs as the non-root `nextjs` user, and /app is root-owned, so
# without this the very first upload dies on EACCES trying to mkdir it.
# Declared a volume too: container-local disk is ephemeral, and uploads
# shouldn't vanish on redeploy. Set STORAGE_DRIVER=s3 to bypass this path.
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage
VOLUME ["/app/storage"]

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
