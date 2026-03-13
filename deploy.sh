#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.docker ]]; then
  echo ".env.docker file is missing. Copy .env.docker.example to .env.docker and update values."
  exit 1
fi

export COMPOSE_FILE="docker-compose.yml"

docker compose --env-file .env.docker down --remove-orphans
docker compose --env-file .env.docker build --pull
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
