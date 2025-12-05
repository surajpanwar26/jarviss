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

# Install ALL dependencies (not just production) to enable build
RUN npm install

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

# Expose port (Render.com will set PORT environment variable)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:10000/ || exit 1

# Start backend server
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:10000", "backend.server:app"]