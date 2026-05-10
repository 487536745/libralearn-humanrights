FROM node:20-bookworm

WORKDIR /app

# System dependencies for audio + lip-sync pipeline
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg wget unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install Rhubarb Lip Sync (binary + required resources)
ARG RHUBARB_VERSION=1.14.0
RUN wget -O /tmp/rhubarb.zip "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip" \
  && unzip -q /tmp/rhubarb.zip -d /opt \
  && mv "/opt/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux" /opt/rhubarb \
  && chmod +x /opt/rhubarb/rhubarb \
  && rm -f /tmp/rhubarb.zip

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

ENV NODE_ENV=production
ENV RHUBARB_PATH=/opt/rhubarb/rhubarb

EXPOSE 10000

CMD ["npm", "start"]
