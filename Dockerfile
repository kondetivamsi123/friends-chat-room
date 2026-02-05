# Build Stage for Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend_chat
COPY frontend_chat/package*.json ./
RUN npm install
COPY frontend_chat/ .
RUN npm run build

# Final Stage for Backend
FROM python:3.10-slim
WORKDIR /app

# Install dependencies
COPY backend_python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend_chat/dist ./frontend_chat/dist

# Copy backend code
COPY backend_python/ ./backend_python/

# Environment variables
ENV PORT=8069
ENV PYTHONUNBUFFERED=1

# Start command (using gunicorn for production)
CMD ["gunicorn", "--bind", "0.0.0.0:8069", "--working-directory", "backend_python", "server:app"]
