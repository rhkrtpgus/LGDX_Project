# FastAPI Backend

Current routes:

- `/fastapi/system/health`
- `/fastapi/analysis/youtube`
- `/fastapi/analysis/history`
- `/fastapi/settings/runtime`
- `/fastapi/monitor/start`
- `/fastapi/monitor/active`
- `/fastapi/monitor/live`
- `/fastapi/monitor/stop`

Run locally:

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\FastAPI
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Landmark camera monitor environment:

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\FastAPI
C:\Users\4121\AppData\Local\Programs\Python\Python311\python.exe -m venv .venv-monitor
.venv-monitor\Scripts\Activate.ps1
pip install -r requirements-monitor.txt
pip install mediapipe==0.10.20 --no-deps
```

Camera collection on Windows:

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\FastAPI
.\scripts\start-fastapi-camera.ps1
```

- This stops only the Docker `fastapi` service and keeps PostgreSQL/MongoDB running in Docker.
- `addiction.py` then runs with `.venv-monitor`, so OpenCV can access the host camera directly and MediaPipe landmarks stay available.
- Front dev server should call FastAPI on `http://localhost:8000`.

Recommended camera test flow:

1. Keep `postgres`, `mongo`, and `back` containers running.
2. Start local FastAPI with `.\scripts\start-fastapi-camera.ps1`.
3. Open the Front dev server and enter the YouTube screen.
4. Let one recommended video pass filtering and start monitoring.
5. Check `GET http://localhost:8000/fastapi/monitor/live?childId=1` for `blinkBpm`, `screenDistanceCm`, and `poseStatus`.

Environment:

- Copy `.env.example` to `.env`
- Set `API_PREFIX=/fastapi`
- Set `CORS_ALLOW_ALL=true` only when you need an emergency wide-open CORS fallback
