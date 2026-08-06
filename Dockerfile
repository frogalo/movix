# ──────────────────────────────────────────────
# Stage 1: Install dependencies
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ──────────────────────────────────────────────
# Stage 2: Build the application
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (reads schema only, but config checks for env variables)
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dummy" npx prisma generate

# Build Next.js in standalone mode.
RUN NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dummy" \
    TWITCH_CLIENT_ID="dummy_client_id" \
    TWITCH_CLIENT_SECRET="dummy_client_secret" \
    TMDB_API_KEY="dummy_tmdb_key" \
    RESEND_API_KEY="dummy_resend_key" \
    SMTP_HOST="localhost" \
    SMTP_PORT="1025" \
    SMTP_USER="user" \
    SMTP_PASSWORD="pass" \
    EMAIL_FROM="noreply@movix.local" \
    AUTH_URL="http://localhost:3014" \
    AUTH_SECRET="build_time_secret_123456789" \
    NODE_OPTIONS="--max-old-space-size=2048" \
    npm run build

# Remove development dependencies to keep the production image size small
# npm prune moved to runner stage (kept for dev builds)

# ──────────────────────────────────────────────
# Stage 3: Production runtime
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output (includes bundled node_modules for the app)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + migrations + config (needed for `prisma migrate deploy` at startup)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Copy the pruned node_modules so that the Prisma CLI (and its engines/dependencies)
# is fully available for running database migrations at startup.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3014
ENV PORT=3014
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
