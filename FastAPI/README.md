# FastAPI Backend

Current routes:

- `/fastapi/system/health`
- `/fastapi/analysis/youtube`
- `/fastapi/analysis/history`
- `/fastapi/settings/runtime`

Run locally:

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\FastAPI
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Environment:

- Copy `.env.example` to `.env`
- Set `API_PREFIX=/fastapi`
- Set `CORS_ALLOW_ALL=true` only when you need an emergency wide-open CORS fallback
