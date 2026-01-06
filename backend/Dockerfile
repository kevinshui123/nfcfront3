FROM python:3.12-slim

WORKDIR /app

# Install system build deps needed for some Python packages (asyncpg, psycopg)
RUN apt-get update && apt-get install -y --no-install-recommends \ 
    gcc \ 
    build-essential \ 
    libpq-dev \ 
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install -r /app/requirements.txt

# Copy application source
COPY . /app

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.10-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


