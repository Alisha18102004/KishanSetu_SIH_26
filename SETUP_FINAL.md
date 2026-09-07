# KisanSetu Final Setup

## 1. Supabase
1. Open the Supabase project.
2. Open **SQL Editor**.
3. Paste and run `backend/schema.sql`.
4. Open **Project Settings -> API** and copy the server-side Secret/Service Role key.

## 2. Backend environment
Copy:
`backend/.env.example` -> `backend/.env`

Set:
```env
SUPABASE_URL=https://dphpndderklgbgilfbga.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_KEY
FRONTEND_ORIGIN=http://localhost:5173
```
Never put the service-role key in React/Vite.

## 3. Backend
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test:
`http://127.0.0.1:8000/api/health`

Expected when configured:
```json
{"status":"ok","database":"supabase","centres":38}
```

## 4. Frontend
Create `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```
Then:
```bash
cd frontend
npm install
npm run dev
```

## 5. Booking rules
- Past dates are rejected by FastAPI.
- For today, any slot whose start time has already passed is rejected by FastAPI.
- The `/api/slots` endpoint marks those slots unavailable in the UI.
- Future dates expose all five slots, subject to capacity.
- Capacity = number of counters x 10 bookings per slot.

## 6. Token system
`backend/schema.sql` creates `next_mandi_token(p_centre_id)`.
FastAPI calls this PostgreSQL function through Supabase RPC, so token generation is database-backed and safe across multiple backend requests.

## 7. Demo seed
After the backend is running, POST:
`http://127.0.0.1:8000/api/demo/seed`

It creates a demo farmer and today's queue in Supabase. Login with mobile `9000000001`.

## 8. Important
The database is persistent in Supabase. Restarting FastAPI does not erase farmers, bookings, queue records, procurement or payment records.
