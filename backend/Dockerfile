# ---- Base: Node 22 on Debian (slim keeps the image small) ----
FROM node:22-slim

# Install Python and pip (needed for CLIP image embeddings)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies first (cached unless package.json changes)
COPY package*.json ./
RUN npm ci --omit=dev

# Set up Python virtual environment and install ML dependencies
COPY ml/ ./ml/
RUN python3 -m venv .venv && \
    .venv/bin/pip install --no-cache-dir \
        torch --index-url https://download.pytorch.org/whl/cpu && \
    .venv/bin/pip install --no-cache-dir \
        open-clip-torch Pillow numpy && \
    # Fetch breed lists from public APIs once at build time
    .venv/bin/python ml/fetch_breeds.py

# Copy the rest of the backend code
COPY . .

# Create directories that need to exist at runtime
RUN mkdir -p uploads

# Fly.io will mount a persistent volume at /data
# The app uses DATA_DIR env var to know where to store the DB and uploads
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
