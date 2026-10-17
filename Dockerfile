FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install gcx CLI (https://grafana.com/docs/grafana-cloud/as-code/observability-as-code/grafana-cli/gcx/installation/)
# Empty GCX_VERSION installs the latest release; pin it for reproducible builds.
ARG GCX_VERSION=
RUN curl -fsSL https://raw.githubusercontent.com/grafana/gcx/main/scripts/install.sh \
  | GCX_VERSION="${GCX_VERSION}" GCX_INSTALL_DIR=/usr/local/bin sh \
  && gcx --version

# tsx (devDependency) runs the TypeScript sources directly, so keep dev deps.
COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src

ENV PORT=8080
EXPOSE 8080

# API by default; the worker overrides the command (see docker-compose.yml).
CMD ["npx", "tsx", "src/api/api.ts"]
