FROM node:20-bookworm

WORKDIR /app

# System dependencies for audio + lip-sync pipeline
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg wget unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install Rhubarb Lip Sync (Linux binary)
ARG RHUBARB_VERSION=1.14.0
RUN wget -O /tmp/rhubarb.zip "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip" \
  && unzip -q /tmp/rhubarb.zip -d /tmp \
  && install -m 755 "/tmp/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/rhubarb" /usr/local/bin/rhubarb \
  && rm -rf /tmp/rhubarb.zip "/tmp/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux"

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV RHUBARB_PATH=/usr/local/bin/rhubarb

EXPOSE 10000

CMD ["npm", "start"]
