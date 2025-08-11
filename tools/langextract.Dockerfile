# Minimal image for LangExtract service
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY tools/langextract_service.py /app/tools/langextract_service.py

# Install OS deps if needed
RUN pip install --no-cache-dir fastapi uvicorn[standard] "langextract[openai]"

EXPOSE 8788
CMD ["uvicorn", "tools.langextract_service:app", "--host", "0.0.0.0", "--port", "8788"]

