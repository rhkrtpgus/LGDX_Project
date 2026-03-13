# Nginx Setup

이 설정은 아래 구조를 전제로 한다.

- React build: `Front/dist`
- Spring Back: `http://localhost:8082`
- FastAPI: `http://localhost:8000`

라우팅 기준:

- `/api/analysis`, `/api/analysis/*` -> FastAPI
- `/model-api/*` -> FastAPI
- 그 외 `/api/*` -> Spring Back
- `/` -> React 정적 파일

## 실행 순서

1. 프런트 빌드

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\Front
npm.cmd run build
```

2. Spring Back 실행

3. FastAPI 실행

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\FastAPI
.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

4. Nginx 실행

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project
docker compose -f docker-compose.nginx.yml up -d
```

## 접속

- 메인 화면: `http://localhost/`
- FastAPI 직접 health 확인: `http://localhost/model-api/system/health`
