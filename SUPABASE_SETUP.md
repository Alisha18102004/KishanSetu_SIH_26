# KisanSetu — Supabase + Time Validation Setup

## 1. Create Supabase project
Create a project in Supabase and open **SQL Editor**.

## 2. Run schema
Copy the complete contents of `backend/schema.sql` into the SQL Editor and run it.

## 3. Configure backend
Copy `backend/.env.example` to `backend/.env` and fill:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
FRONTEND_ORIGIN=http://localhost:5173
```

Use the **service role key only in the backend**. Never put it in React/Vite `.env`.

## 4. Install backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 5. Run frontend
```bash
cd frontend
npm install
npm run dev
```

## 6. Booking time rule
For today's date, a slot is bookable only when its start time is still in the future. For example, if it is 3:00 PM, the 10:00–12:00 and 12:00–14:00 slots are rejected by the backend and returned as unavailable by `/api/slots`.

Future dates can use all five slots, subject to capacity.

## 7. Language
The header language button now switches Hindi/English and persists the choice in `localStorage` as `ks_language`. Navigation labels also switch.
