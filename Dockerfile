# --- Stage 1: Build the Frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# --- Stage 2: Final Backend Image ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy build requirements and source code
COPY pyproject.toml README.md LICENSE ./
COPY src/ /app/src/

# Copy the built frontend from Stage 1 into the static directory
# This allows the FastAPI backend to serve the frontend
COPY --from=frontend-build /app/frontend/dist /app/src/vertiflow/static

# Install the package and its dependencies
RUN pip install --no-cache-dir .

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start command
CMD ["uvicorn", "vertiflow.main:app", "--host", "0.0.0.0", "--port", "8000"]
