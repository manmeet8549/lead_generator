# ---- Build Stage ----
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create exports directory
RUN mkdir -p exports

# ---- Runtime ----
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

CMD ["node", "src/index.js"]
