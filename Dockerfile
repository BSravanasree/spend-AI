# Dockerfile for SpendAI Backend
# Used when Render service type is set to "Docker"
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy backend source code
COPY backend/src ./src

# Expose the port Render will assign
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
