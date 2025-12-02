# Multi-stage Dockerfile for JARVIS Research System

# Backend Stage
FROM python:3.9-slim as backend-builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY .env .

# Frontend Stage
FROM node:18-alpine as frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend code
COPY . .

# Build frontend
RUN npm run build

# Production Stage
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend from backend-builder stage
COPY --from=backend-builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=backend-builder /app/backend/ ./backend/
COPY --from=backend-builder /app/.env ./.env

# Copy frontend build from frontend-builder stage
COPY --from=frontend-builder /app/dist ./dist

# Expose ports
EXPOSE 8000
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start backend server
CMD ["python", "backend/server.py"]