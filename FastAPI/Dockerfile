FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY FastAPI/requirements.txt /app/FastAPI/requirements.txt

RUN pip install -r /app/FastAPI/requirements.txt

COPY FastAPI /app/FastAPI
COPY Models /app/Models

WORKDIR /app/FastAPI

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
