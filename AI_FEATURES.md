# KisanSetu AI Features

This build keeps the existing UI and adds explainable, demo-friendly AI features:

1. AI Smart Slot Planner
   - Recommends the lowest-wait available slot.
   - Uses queue load, counter capacity, quantity and historical service observations.
   - Shows top 3 AI-ranked slots.

2. AI Live Queue ETA
   - Predicts farmer wait time from live queue position, counters, quantity, slot and learned service history.
   - Shows Smart Arrival / Leave-in timing to the farmer.

3. AI Mandi Intelligence (Operator)
   - Congestion risk score (Low/Medium/High).
   - Recency-weighted next-day booking forecast.
   - Historical average wait/service time.
   - Recommended counter capacity.
   - Operational alerts.

4. AI Anomaly Detection
   - Flags unusually long waits for operator review.

The AI is intentionally explainable and dependency-light: it does not require an external LLM/API key to run.
