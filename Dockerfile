FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements or pyproject.toml
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy source code
COPY src/ /app/src/

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "vertiflow.main:app", "--host", "0.0.0.0", "--port", "8000"]
