FROM python:3.11-slim

WORKDIR /app

COPY provider_node/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY provider_node/ ./provider_node/

ENV PORT=5001
ENV NODE_ID=docker-provider
ENV GPU_MODEL=CPU

EXPOSE 5001

CMD ["python", "-m", "provider_node.server"]
