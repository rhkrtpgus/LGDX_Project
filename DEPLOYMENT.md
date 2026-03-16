# Docker Deployment

## 1. Server prerequisites

- Linux server with Docker Engine and Docker Compose plugin
- At least 8 CPU / 16 GB RAM recommended because FastAPI builds TensorFlow and ONNX runtime
- Open ports: `80`, `3355` if PostgreSQL must be exposed, `27017` if MongoDB must be exposed
- If you want HTTPS, also prepare `443` and a certificate strategy

## 2. Prepare environment

```bash
cd /srv/lgdx
cp .env.docker.production.example .env.docker
```

Update `.env.docker`:

- Set `POSTGRES_PASSWORD`
- Set `CORS_ORIGINS` to the real frontend domain
- Adjust `NGINX_PORT`, `SPRING_PORT`, `FASTAPI_PORT` if needed
- Keep `FASTAPI_API_PREFIX=/fastapi`
- If the deployment server has a real camera device for `addiction.py`, set `ADDICTION_MONITOR_CAMERA_INDEX`
- First deployment only: keep `SPRING_SQL_INIT_MODE=always`
- After the first successful boot: change `SPRING_SQL_INIT_MODE=never` so data persists across restarts

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

## 5. Manual test flow

- Use [TEST_FLOW.md](./TEST_FLOW.md) after deployment.
- The most important flow to verify is:
  - `설정`에서 가족/자녀 선택
  - `아이들나라` 진입 시 해당 자녀 페이지가 바로 열리는지 확인
  - `유튜브` 진입 시 분석 화면이 먼저 뜨는지 확인
  - 새로고침 후에도 자녀 선택이 유지되는지 확인

## 6. What you need to provide for real deployment

If you want me to prepare or execute the deployment, I need:

- Server public IP or domain
- SSH access method
  - SSH user
  - private key or whether password login is allowed
  - whether `sudo` is available
- The target path where the project should live on the server, for example `/srv/lgdx`
- Production `.env.docker` values
  - `POSTGRES_PASSWORD`
  - `CORS_ORIGINS`
  - whether PostgreSQL and MongoDB ports should be exposed externally
  - whether the server will actually use a camera for `addiction.py`
  - whether this is a first boot or an existing database that must be preserved
- Whether you want me to also set up HTTPS and a domain binding

## 7. Notes

- Frontend is baked into the Nginx image during build.
- PostgreSQL and MongoDB use Docker volumes: `postgres_data`, `mongo_data`.
- `addiction.py` camera monitoring needs a camera-capable runtime. On a headless server without camera access, analysis still saves to PostgreSQL, and MongoDB stores failure session/event documents when the monitor cannot start.
- The FastAPI container uses Python 3.11 so `yt-dlp`, TensorFlow, ONNX Runtime, and MediaPipe are aligned for deployment better than the current host Python 3.13 environment.
- There is no login system yet. The current design treats `familyId` as the server-side owner of the saved child preference.
