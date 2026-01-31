# ============================================
# AixL Admin Web Dockerfile (Production)
# ============================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies for Tailwind/PostCSS)
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_ADMIN_TOKEN

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_ADMIN_TOKEN=${NEXT_PUBLIC_ADMIN_TOKEN}

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002

CMD ["node", "server.js"]
