# KisanSetu V8 — SIH 26032 Smart Mandi Flow

A farmer-first procurement scheduling and queue orchestration platform designed around SIH 26032.

## Core problem solved
- Long waiting at procurement centres
- No visibility into daily procurement schedule
- Uncertainty around token/queue position
- No single view of procurement and payment status

## Winning demo flow
1. Open the app.
2. Click **Open Judge Demo — Live Mandi Flow**.
3. Show the farmer dashboard: token, live queue, ETA and Smart Arrival recommendation.
4. Book another mandi slot and show capacity/occupancy.
5. Open Live Queue and explain auto-refresh + suggested departure time.
6. Switch to a centre/operator account and call/complete tokens.
7. Record procurement → show payment/DBT → download e-receipt.

## Differentiators
- Smart Arrival: deterministic ETA + departure recommendation from live queue, no black-box AI required.
- Capacity-aware slots with occupancy visibility.
- Farmer check-in and cancellation flow.
- Operator console for queue orchestration.
- Hindi/English-friendly UI and voice assistant.
- Email + in-app notifications; SMS can be added later through a government/enterprise gateway.
- Judge Demo mode so the full workflow can be demonstrated in minutes.

## Run
### One click
Double-click `start.bat`.

### Backend
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

### Frontend
```powershell
cd frontend
npm run dev
```

Do not run `pip install` or `npm install` every time. Install dependencies only once or when dependency files change.

## Note
Centre latitude/longitude values in the demo are representative district-level points, not claims of official depot coordinates. Replace them with verified government data before production deployment.
