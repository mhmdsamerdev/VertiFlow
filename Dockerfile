# --- Stage 1: Final Backend Image ---
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

# Install the package and its dependencies
RUN pip install --no-cache-dir .
RUN pip install --no-cache-dir gunicorn uvicorn

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start command using gunicorn for production stability
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "vertiflow.main:app"]
