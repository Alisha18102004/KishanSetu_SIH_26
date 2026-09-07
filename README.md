# KisanSetu V8 – Modular Full Stack

This package contains both the modular React frontend and the FastAPI backend.

## Structure

- `frontend/` – React + Vite + Tailwind, split into pages/components/api/utils/data
- `backend/` – FastAPI backend and notification services
- `start.bat` – Windows helper

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000` and frontend at the Vite URL shown in the terminal.

The backend is the original V8 backend; the React frontend has been reorganized into separate files for easier debugging.
