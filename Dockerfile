# Build stage
FROM node:24.12.0-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy all source code
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build only Linux version
RUN pnpm build:nexe -- --linux-only

# Production stage
FROM ubuntu:22.04

WORKDIR /app

# Copy executable from builder
COPY --from=builder /app/dist/kugou-exporter-linux-v* ./kugou-exporter

# Make executable
RUN chmod +x ./kugou-exporter

# Expose port
EXPOSE 3000

# Create volume for config
VOLUME ["/app/data"]

# Set environment variable for config path
ENV CONFIG_PATH=/app/data/config.yaml

# Start the application
CMD ["./kugou-exporter"]
