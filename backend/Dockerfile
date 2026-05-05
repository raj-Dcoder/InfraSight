FROM python:3.11-slim

WORKDIR /app

# System deps for PostGIS + PDF + Playwright
RUN apt-get update && apt-get install -y \
    libpq-dev gcc curl wget gnupg \
    libgeos-dev libgdal-dev \
    libxml2-dev libxslt1-dev \
    chromium \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
