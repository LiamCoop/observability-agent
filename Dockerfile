FROM python:3.12-slim

WORKDIR /app

# Install system deps if gcx needs them
RUN apt-get update && apt-get install -y curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install gcx CLI
# COPY gcx /usr/local/bin/gcx
# or curl/download it from your internal artifact registry
RUN chmod +x /usr/local/bin/gcx

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "agent_api:app", "--host", "0.0.0.0", "--port", "8080"]