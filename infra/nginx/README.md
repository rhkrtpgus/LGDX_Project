# Nginx Setup

Routing:

- `/fastapi/*` -> FastAPI (`localhost:8000`)
- `/model-api/*` -> FastAPI compatibility alias
- `/api/*` -> Spring Boot (`localhost:8082`)
- `/` -> React static files

Run order:

1. Build React

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\Front
npm.cmd run build
```

2. Start Spring Boot on `8082`
3. Start FastAPI on `8000`
4. Start Nginx

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project
docker compose -f docker-compose.nginx.yml up -d
```

Useful URLs:

- Main app: `http://localhost/`
- FastAPI health: `http://localhost/fastapi/system/health`
