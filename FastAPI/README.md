# FastAPI Backend

기본 FastAPI 프로젝트다.

현재 포함 범위:

- `/api/system/health`
- `/api/analysis/youtube`
- `Models/API.py` 래퍼 서비스
- PostgreSQL, MongoDB 설정 자리

## 실행

```powershell
cd c:\Users\4121\Desktop\DX\LGDX_Project\FastAPI
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 다음 단계

1. PostgreSQL insert 구현
2. MongoDB telemetry insert 구현
3. `addiction.py` 실행/수집 API 구현
4. Front 프록시와 `/api` 계약 정렬
