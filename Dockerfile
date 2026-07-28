# ──────────────────────────────────────────────
# Stage 1: Install dependencies
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ──────────────────────────────────────────────
# Stage 2: Build the application
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (reads schema only, but config checks for env variables)
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dummy" npx prisma generate

# Build Next.js in standalone mode.
RUN NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dummy" \
    AUTH_SECRET="build_time_secret_123456789" \
    npm run build

# Remove development dependencies to keep the production image size small
RUN npm prune --omit=dev

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

# Copy Prisma schema + migrations (needed for `prisma migrate deploy` at startup)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

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
