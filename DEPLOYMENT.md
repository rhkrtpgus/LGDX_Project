# Docker Deployment

## 1. Server prerequisites

- Linux server with Docker Engine and Docker Compose plugin
- At least 8 CPU / 16 GB RAM recommended because FastAPI builds TensorFlow and ONNX runtime
- Open ports: `80`, `3355` if PostgreSQL must be exposed, `27017` if MongoDB must be exposed

## 2. Prepare environment

```bash
cd /srv/lgdx
cp .env.docker.example .env.docker
```

Update `.env.docker`:

- Set `POSTGRES_PASSWORD`
- Adjust `NGINX_PORT`, `SPRING_PORT`, `FASTAPI_PORT` if needed
- Keep `FASTAPI_API_PREFIX=/fastapi`
- If the deployment server has a real camera device for `addiction.py`, set `ADDICTION_MONITOR_CAMERA_INDEX`

## 3. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

Manual equivalent:

```bash
docker compose --env-file .env.docker build --pull
docker compose --env-file .env.docker up -d
```

## 4. Check services

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f nginx
docker compose --env-file .env.docker logs -f fastapi
docker compose --env-file .env.docker logs -f back
```

Health URLs:

- `http://SERVER_IP/`
- `http://SERVER_IP/fastapi/system/health`
- `http://SERVER_IP/fastapi/docs`
- `http://SERVER_IP/api/settings/runtime`

## 5. Notes

- Frontend is baked into the Nginx image during build.
- PostgreSQL and MongoDB use Docker volumes: `postgres_data`, `mongo_data`.
- `addiction.py` camera monitoring needs a camera-capable runtime. On a headless server without camera access, analysis still saves to PostgreSQL, and MongoDB stores failure session/event documents when the monitor cannot start.
- The FastAPI container uses Python 3.11 so `yt-dlp`, TensorFlow, ONNX Runtime, and MediaPipe are aligned for deployment better than the current host Python 3.13 environment.
