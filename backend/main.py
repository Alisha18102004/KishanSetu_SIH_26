import os
import math
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional
import threading
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from db import supabase, SUPABASE_ENABLED
from time_utils import SLOTS, validate_booking_time, parse_slot_end
from ai_engine import build_model, features, predict, explain, slot_start, operational_insights, anomaly_flags
from services.whatsapp import send_whatsapp
from services.email import send_email

load_dotenv()

app = FastAPI(title="KisanSetu V9 API", version="9.0.0")
origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"), "http://127.0.0.1:5173"]
app.add_middleware(CORSMiddleware, allow_origins=list(set(origins)), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

CENTRES = [
    {"centre_id":"C001","district":"Araria","city":"Araria","lat":26.1558,"lon":87.5017,"counters":3},
    {"centre_id":"C002","district":"Arwal","city":"Arwal","lat":25.2492,"lon":84.6810,"counters":2},
    {"centre_id":"C003","district":"Aurangabad","city":"Aurangabad","lat":24.7521,"lon":84.3742,"counters":3},
    {"centre_id":"C004","district":"Banka","city":"Banka","lat":24.8874,"lon":86.9198,"counters":2},
    {"centre_id":"C005","district":"Begusarai","city":"Begusarai","lat":25.4182,"lon":86.1272,"counters":4},
    {"centre_id":"C006","district":"Bhagalpur","city":"Bhagalpur","lat":25.2425,"lon":86.9842,"counters":4},
    {"centre_id":"C007","district":"Bhojpur","city":"Ara","lat":25.5560,"lon":84.6633,"counters":3},
    {"centre_id":"C008","district":"Buxar","city":"Buxar","lat":25.5647,"lon":83.9777,"counters":2},
    {"centre_id":"C009","district":"Darbhanga","city":"Darbhanga","lat":26.1542,"lon":85.8918,"counters":4},
    {"centre_id":"C010","district":"East Champaran","city":"Motihari","lat":26.6499,"lon":84.9161,"counters":4},
    {"centre_id":"C011","district":"Gaya","city":"Gaya","lat":24.7955,"lon":84.9994,"counters":5},
    {"centre_id":"C012","district":"Gopalganj","city":"Gopalganj","lat":26.4672,"lon":84.4402,"counters":3},
    {"centre_id":"C013","district":"Jamui","city":"Jamui","lat":24.9260,"lon":86.2249,"counters":2},
    {"centre_id":"C014","district":"Jehanabad","city":"Jehanabad","lat":25.2070,"lon":84.9874,"counters":3},
    {"centre_id":"C015","district":"Kaimur","city":"Bhabua","lat":25.0400,"lon":83.6150,"counters":2},
    {"centre_id":"C016","district":"Katihar","city":"Katihar","lat":25.5394,"lon":87.5788,"counters":4},
    {"centre_id":"C017","district":"Khagaria","city":"Khagaria","lat":25.5022,"lon":86.4671,"counters":3},
    {"centre_id":"C018","district":"Kishanganj","city":"Kishanganj","lat":26.1025,"lon":87.9553,"counters":2},
    {"centre_id":"C019","district":"Lakhisarai","city":"Lakhisarai","lat":25.1574,"lon":86.0952,"counters":2},
    {"centre_id":"C020","district":"Madhepura","city":"Madhepura","lat":25.9213,"lon":86.7927,"counters":3},
    {"centre_id":"C021","district":"Madhubani","city":"Madhubani","lat":26.3489,"lon":86.0717,"counters":4},
    {"centre_id":"C022","district":"Munger","city":"Munger","lat":25.3708,"lon":86.4734,"counters":3},
    {"centre_id":"C023","district":"Muzaffarpur","city":"Muzaffarpur","lat":26.1209,"lon":85.3647,"counters":5},
    {"centre_id":"C024","district":"Nalanda","city":"Bihar Sharif","lat":25.1980,"lon":85.5149,"counters":4},
    {"centre_id":"C025","district":"Nawada","city":"Nawada","lat":24.8860,"lon":85.5430,"counters":3},
    {"centre_id":"C026","district":"Patna","city":"Patna","lat":25.5941,"lon":85.1376,"counters":6},
    {"centre_id":"C027","district":"Purnia","city":"Purnea","lat":25.7771,"lon":87.4753,"counters":4},
    {"centre_id":"C028","district":"Rohtas","city":"Sasaram","lat":24.9490,"lon":84.0060,"counters":3},
    {"centre_id":"C029","district":"Saharsa","city":"Saharsa","lat":25.8830,"lon":86.6006,"counters":3},
    {"centre_id":"C030","district":"Samastipur","city":"Samastipur","lat":25.8629,"lon":85.7810,"counters":4},
    {"centre_id":"C031","district":"Saran","city":"Chhapra","lat":25.7796,"lon":84.7499,"counters":4},
    {"centre_id":"C032","district":"Sheikhpura","city":"Sheikhpura","lat":25.1390,"lon":85.8551,"counters":2},
    {"centre_id":"C033","district":"Sheohar","city":"Sheohar","lat":26.5147,"lon":85.2940,"counters":2},
    {"centre_id":"C034","district":"Sitamarhi","city":"Sitamarhi","lat":26.5887,"lon":85.5016,"counters":3},
    {"centre_id":"C035","district":"Siwan","city":"Siwan","lat":26.2200,"lon":84.3560,"counters":3},
    {"centre_id":"C036","district":"Supaul","city":"Supaul","lat":26.1260,"lon":86.6050,"counters":3},
    {"centre_id":"C037","district":"Vaishali","city":"Hajipur","lat":25.6865,"lon":85.2162,"counters":4},
    {"centre_id":"C038","district":"West Champaran","city":"Bettiah","lat":27.0992,"lon":84.0900,"counters":4},
]
for c in CENTRES:
    c["name"] = f"{c['district']} Procurement Centre"
    c["address"] = f"{c['city']}, {c['district']}, Bihar"

class FarmerIn(BaseModel):
    mobile: str
    email: Optional[str] = None
    name: str
    village: str
    district: str
    crop: str = "Wheat"
    centre_id: str = "C014"

class CentreIn(BaseModel):
    employee_id: str
    mobile: str
    name: str
    centre_id: str
    district: str
    address: str
    counters: int = Field(default=2, ge=1, le=20)

class LoginIn(BaseModel):
    mobile: str
    role: str
    farmer_id: Optional[str] = None
    employee_id: Optional[str] = None

class BookingIn(BaseModel):
    farmer_id: str
    centre_id: str
    crop: str
    quantity_kg: float
    date: str
    slot: str

class QueueAction(BaseModel):
    token: str
    action: str

class PaymentIn(BaseModel):
    farmer_id: str
    token: str

class ProcurementIn(BaseModel):
    farmer_id: str
    centre_id: str
    crop: str
    quantity_kg: float
    quality_grade: str = "FAQ"
    rate_per_kg: float = 22.5
    employee_id: Optional[str] = None

def find_centre(centre_id):
    return next((c for c in CENTRES if c["centre_id"] == centre_id), None)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def db_required():
    if not SUPABASE_ENABLED or supabase is None:
        raise HTTPException(503, "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env")
    return supabase

def rows(table, **filters):
    q = db_required().table(table).select("*")
    for key, value in filters.items():
        q = q.eq(key, value)
    return q.execute().data or []

def first(table, **filters):
    data = rows(table, **filters)
    return data[0] if data else None

def notify(farmer_id, title, message):
    farmer = first("farmers", farmer_id=farmer_id)
    payload = {"farmer_id": farmer_id, "title": title, "message": message}
    try:
        db_required().table("notifications").insert(payload).execute()
    except Exception as exc:
        print("notification db error:", exc)
    if farmer:
        try: send_whatsapp(farmer.get("mobile", ""), f"{title}\n{message}")
        except Exception: pass
        if farmer.get("email"):
            try: send_email(farmer["email"], f"KisanSetu: {title}", message)
            except Exception: pass

def auto_skip_expired_waiting(centre_id=None):
    """Move stale waiting bookings to skipped and persist the audit fields.
    A waiting token is auto-skipped 3 hours after its booked slot END time.
    """
    today = datetime.now().date().isoformat()
    data = rows("bookings", date=today, **({"centre_id": centre_id} if centre_id else {}))
    now = datetime.now()
    for b in data:
        if b.get("status") != "waiting":
            continue
        try:
            slot_end = parse_slot_end(b["slot"])
            deadline = datetime.combine(datetime.fromisoformat(b["date"]).date(), slot_end) + timedelta(hours=3)
        except Exception:
            continue
        if now >= deadline:
            reason = "Auto-skipped: farmer did not arrive within 3 hours after slot end."
            db_required().table("bookings").update({
                "status": "skipped",
                "skipped_at": now.isoformat(),
                "skip_reason": reason,
            }).eq("booking_id", b["booking_id"]).eq("status", "waiting").execute()
            notify(b["farmer_id"], "Slot Auto-Skipped", f"Token {b['token']} was skipped because the 3-hour grace period after your slot ended.")

def auto_skip_worker():
    while True:
        try:
            if SUPABASE_ENABLED:
                auto_skip_expired_waiting()
        except Exception as exc:
            print("[KisanSetu] auto-skip error:", exc)
        time.sleep(60)

def _slot_start_minutes(slot):
    try:
        t = datetime.strptime(slot.split("-")[0].strip(), "%H:%M").time()
        return t.hour * 60 + t.minute
    except Exception:
        return 10**9

def _queue_priority(b):
    # Slot-aware queue: checked-in farmers first; deferred/no-show waiting tokens
    # never block the next eligible farmer. Earlier slot always outranks later slot.
    deferred = 1 if b.get("deferred_at") else 0
    checked = 0 if b.get("checked_in") else 1
    return (deferred, _slot_start_minutes(b.get("slot", "")), checked, b.get("created_at", ""))

def _decorate_queue(data):
    now = datetime.now()
    current_min = now.hour * 60 + now.minute
    active = [b for b in data if b.get("status") in ("waiting", "serving", "procurement_pending")]
    for b in active:
        start = _slot_start_minutes(b.get("slot", ""))
        b["eligible_now"] = bool(b.get("checked_in")) or start <= current_min
        b["queue_priority"] = "checked-in" if b.get("checked_in") else ("slot-active" if b["eligible_now"] else "upcoming")
    active.sort(key=_queue_priority)
    for i, b in enumerate(active, 1):
        b["queue_rank"] = i
    return active

def queue_for(centre_id):
    auto_skip_expired_waiting(centre_id)
    today = datetime.now().date().isoformat()
    data = rows("bookings", centre_id=centre_id, date=today)
    return _decorate_queue(data)

def queue_state(centre_id, user_token=None):
    centre = find_centre(centre_id)
    items = queue_for(centre_id)
    serving = next((b for b in items if b["status"] == "serving"), None)
    eligible = [b for b in items if b.get("eligible_now") and b.get("status") == "waiting" and not b.get("deferred_at")]
    recommended = eligible[0] if eligible else (serving or None)
    matched = next((b for b in items if b["token"] == user_token), None)
    # Completed/skipped/cancelled bookings are deliberately NOT treated as live tokens.
    live_token = user_token if matched else "--"
    ahead = 0
    if matched:
        for b in items:
            if b["token"] == user_token: break
            if b.get("status") in ("waiting", "serving") and b.get("eligible_now") and not b.get("deferred_at"):
                ahead += 1
    counters = max(1, int(centre["counters"] if centre else 1))
    bookings = rows("bookings", centre_id=centre_id)
    w, training_count = build_model(bookings, counters)
    x = features(ahead=ahead, counters=counters, quantity=float(matched.get("quantity_kg") or 0) if matched else 0,
                 slot=matched.get("slot", SLOTS[0]) if matched else SLOTS[0],
                 checked_in=bool(matched.get("checked_in")) if matched else False)
    base_wait = max(0, math.ceil(ahead * 5 / counters))
    ai_wait = predict(w, x) if w else max(2, round(base_wait * 1.05, 1))
    if matched and not matched.get("eligible_now"):
        ai_wait = max(ai_wait, max(0, slot_start(matched.get("slot", SLOTS[0])) - datetime.now().hour*60-datetime.now().minute))
    queue_status = "Your turn" if matched and ahead == 0 else ("Approaching" if matched and ahead <= 2 else ("Waiting" if matched else "No active booking"))
    utilization = round(min(100, len(items) / (counters * 10) * 100))
    total = max(1, len(items))
    progress = min(100, round((1 - ahead / total) * 100)) if matched else 0
    return {"centre": centre, "user_token": live_token,
            "now_serving": serving["token"] if serving else (recommended["token"] if recommended else "--"),
            "recommended_next": recommended, "ahead": ahead, "estimated_wait_min": ai_wait,
            "recommended_departure_in_min": max(0, round(ai_wait - 10)), "queue_status": queue_status,
            "utilization_percent": utilization, "average_service_min": 5, "progress": progress,
            "status": matched["status"] if matched else "none", "ai": {"enabled": True, "model": "ridge-regression",
            "training_samples": training_count, "confidence": "high" if training_count >= 10 else "cold-start",
            "explanation": explain(ahead, counters, bool(matched and matched.get("checked_in")), matched.get("slot", "-" ) if matched else "-")}}

@app.get("/api/ai/centre-insights")
def ai_centre_insights(centre_id: str):
    centre = find_centre(centre_id)
    if not centre: raise HTTPException(404, "Centre not found")
    bookings = rows("bookings", centre_id=centre_id)
    counters = max(1, int(centre.get("counters") or 1))
    insights = operational_insights(bookings, counters)
    insights["anomalies"] = anomaly_flags(bookings)
    insights["centre_id"] = centre_id
    return insights

@app.get("/api/ai/slot-recommendation")
def ai_slot_recommendation(centre_id: str, booking_date: str, crop: str = "Wheat", quantity_kg: float = 100):
    centre = find_centre(centre_id)
    if not centre: raise HTTPException(404, "Centre not found")
    try: datetime.strptime(booking_date, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "Invalid booking date")
    counters=max(1,int(centre.get("counters") or 1))
    bookings=rows("bookings", centre_id=centre_id, date=booking_date)
    w, training_count=build_model(rows("bookings", centre_id=centre_id), counters)
    results=[]
    for slot in SLOTS:
        active=[b for b in bookings if b.get("slot")==slot and b.get("status") not in ("cancelled","completed","skipped")]
        ahead=len(active); capacity=counters*10
        base=max(2, round(ahead*5/counters,1))
        x=features(ahead=ahead,counters=counters,quantity=quantity_kg,slot=slot,checked_in=False)
        ai=predict(w,x) if w else base
        available=max(0,capacity-ahead)
        results.append({"slot":slot,"predicted_wait_min":ai,"available":available,"utilization_percent":round(ahead/capacity*100),
                        "recommended":False,"reason":f"{available} capacity left; {ahead} active booking(s)"})
    candidates=[r for r in results if r["available"]>0]
    if candidates:
        best=min(candidates,key=lambda r:(r["predicted_wait_min"],r["utilization_percent"]))
        best["recommended"]=True; best["reason"]="Lowest predicted waiting time with available capacity."
    return {"centre_id":centre_id,"date":booking_date,"crop":crop,"quantity_kg":quantity_kg,
            "model":"ridge-regression","training_samples":training_count,"results":results,
            "message":"AI recommendation uses queue load, active counters, quantity and historical service observations."}

@app.on_event("startup")
def startup():
    if not SUPABASE_ENABLED:
        print("[KisanSetu] Supabase is NOT configured. Set backend/.env before using the app.")
        return
    try:
        db_required().table("centres").upsert(CENTRES, on_conflict="centre_id").execute()
        print("[KisanSetu] Supabase connected and centres synced")
        threading.Thread(target=auto_skip_worker, daemon=True).start()
    except Exception as exc:
        print("[KisanSetu] Supabase startup error:", exc)

@app.get("/")
def root(): return {"app":"KisanSetu", "version":"9.0.0", "status":"running", "database":"supabase" if SUPABASE_ENABLED else "not-configured"}

@app.get("/api/health")
def health():
    if SUPABASE_ENABLED:
        try:
            db_required().table("centres").select("centre_id").limit(1).execute()
            return {"status":"ok", "database":"supabase", "centres":len(CENTRES)}
        except Exception as exc: raise HTTPException(503, f"Supabase connection failed: {exc}")
    raise HTTPException(503, "Supabase not configured")

@app.get("/api/centres")
def centres():
    data = rows("centres")
    return data or CENTRES

@app.get("/api/centres/nearest")
def nearest_centres(lat: float, lon: float, limit: int = 5):
    data = centres(); result = [{**c, "distance_km": round(haversine(lat, lon, c["lat"], c["lon"]), 3)} for c in data]
    return sorted(result, key=lambda x: x["distance_km"])[:max(1, min(limit, 38))]

@app.post("/api/farmers")
def register_farmer(data: FarmerIn):
    if not find_centre(data.centre_id): raise HTTPException(400, "Invalid procurement centre")
    existing = first("farmers", mobile=data.mobile)
    if existing: return existing
    farmer_id = "F" + data.mobile[-6:]
    payload = {**data.model_dump(), "farmer_id": farmer_id}
    try:
        result = db_required().table("farmers").insert(payload).execute().data
    except Exception as exc: raise HTTPException(400, f"Farmer registration failed: {exc}")
    farmer = result[0]
    notify(farmer_id, "Welcome to KisanSetu", "Aapka farmer account successfully create ho gaya.")
    return farmer

@app.post("/api/centres/register")
def register_centre(data: CentreIn):
    try:
        # The centre registration form creates/updates the Supabase row.
        # Keep all columns required by the centres table populated.
        existing = first("centres", centre_id=data.centre_id)
        payload = {
            **data.model_dump(),
            "name": data.name.strip() or f"{data.district} Procurement Centre",
            "city": data.district.strip(),
            "lat": 25.2070,
            "lon": 84.9874,
        }
        db = db_required()
        if existing:
            db.table("centres").update(payload).eq("centre_id", data.centre_id).execute()
        else:
            db.table("centres").insert(payload).execute()
        return first("centres", centre_id=data.centre_id) or payload
    except Exception as exc:
        raise HTTPException(400, f"Centre registration failed: {exc}")

@app.patch("/api/farmers/{farmer_id}")
def update_farmer(farmer_id: str, data: dict):
    farmer = first("farmers", farmer_id=farmer_id)
    if not farmer:
        raise HTTPException(404, "Farmer not found")
    allowed = {"name", "email", "village", "district", "crop"}
    payload = {k: v for k, v in data.items() if k in allowed and v is not None}
    if "name" in payload and not str(payload["name"]).strip():
        raise HTTPException(400, "Name is required")
    if "village" in payload and not str(payload["village"]).strip():
        raise HTTPException(400, "Village is required")
    if "district" in payload and not str(payload["district"]).strip():
        raise HTTPException(400, "District is required")
    if "crop" in payload and payload["crop"] not in ("Wheat", "Rice", "Maize", "Mustard"):
        raise HTTPException(400, "Invalid crop")
    try:
        result = db_required().table("farmers").update(payload).eq("farmer_id", farmer_id).execute().data
    except Exception as exc:
        raise HTTPException(400, f"Farmer profile update failed: {exc}")
    return (result or [first("farmers", farmer_id=farmer_id)])[0]

@app.patch("/api/centres/{centre_id}")
def update_centre(centre_id: str, data: dict):
    centre = first("centres", centre_id=centre_id)
    if not centre:
        raise HTTPException(404, "Procurement centre not found")
    allowed = {"name", "district", "city", "address", "counters"}
    payload = {k: v for k, v in data.items() if k in allowed and v is not None}
    if "name" in payload and not str(payload["name"]).strip():
        raise HTTPException(400, "Centre name is required")
    if "district" in payload and not str(payload["district"]).strip():
        raise HTTPException(400, "District is required")
    if "address" in payload and not str(payload["address"]).strip():
        raise HTTPException(400, "Address is required")
    if "counters" in payload:
        try:
            counters = int(payload["counters"])
        except Exception:
            raise HTTPException(400, "Counters must be a number")
        if counters < 1 or counters > 20:
            raise HTTPException(400, "Counters must be between 1 and 20")
        payload["counters"] = counters
    try:
        result = db_required().table("centres").update(payload).eq("centre_id", centre_id).execute().data
    except Exception as exc:
        raise HTTPException(400, f"Centre profile update failed: {exc}")
    return (result or [first("centres", centre_id=centre_id)])[0]

@app.post("/api/auth/login")
def login(data: LoginIn):
    if data.role == "farmer":
        if not data.farmer_id:
            raise HTTPException(400, "Farmer ID is required.")
        user = first("farmers", farmer_id=data.farmer_id)
        if not user:
            raise HTTPException(401, "Invalid Farmer ID.")
        if user.get("mobile") != data.mobile:
            raise HTTPException(401, "Farmer ID and mobile number do not match.")
        return {"user": user}

    if data.role == "centre":
        if not data.employee_id:
            raise HTTPException(400, "Employee ID is required.")
        user = first("centres", employee_id=data.employee_id)
        if not user:
            raise HTTPException(401, "Invalid Employee ID.")
        if user.get("mobile") != data.mobile:
            raise HTTPException(401, "Employee ID and mobile number do not match.")
        return {"user": user}

    raise HTTPException(400, "Invalid role.")

@app.get("/api/slots")
def slots(centre_id: str, booking_date: str):
    centre = find_centre(centre_id)
    if not centre: raise HTTPException(404, "Centre not found")
    try:
        selected = datetime.strptime(booking_date, "%Y-%m-%d").date()
    except ValueError: raise HTTPException(400, "Invalid booking date")
    today = datetime.now().date()
    booked = rows("bookings", centre_id=centre_id, date=booking_date)
    capacity = max(1, int(centre["counters"]) * 10)
    out=[]
    for slot in SLOTS:
        count = sum(1 for b in booked if b["slot"] == slot and b["status"] not in ("cancelled", "completed"))
        is_past = selected < today or (selected == today and datetime.strptime(slot.split("-")[0].strip(), "%H:%M").time() <= datetime.now().time())
        out.append({"slot":slot, "booked":count, "capacity":capacity, "available":max(0, capacity-count), "is_past":is_past,
                    "is_full":count>=capacity, "available_for_booking":(not is_past and count<capacity)})
    return out

@app.post("/api/bookings")
def create_booking(data: BookingIn):
    if not first("farmers", farmer_id=data.farmer_id): raise HTTPException(404, "Farmer not found")
    centre = find_centre(data.centre_id)
    if not centre: raise HTTPException(404, "Centre not found")
    if data.quantity_kg <= 0: raise HTTPException(400, "Quantity must be greater than 0")
    validate_booking_time(data.date, data.slot)
    active = rows("bookings", farmer_id=data.farmer_id, date=data.date)
    if any(b["status"] in ("waiting", "serving", "procurement_pending") for b in active): raise HTTPException(409, "You already have an active booking for this date.")
    capacity = max(1, int(centre["counters"]) * 10)
    same = rows("bookings", centre_id=data.centre_id, date=data.date)
    count = sum(1 for b in same if b["slot"] == data.slot and b["status"] not in ("cancelled", "completed"))
    if count >= capacity: raise HTTPException(409, "Selected slot is full. Please choose another slot.")
    try:
        token_res = db_required().rpc("next_mandi_token", {"p_centre_id": data.centre_id}).execute()
        token = token_res.data
        if isinstance(token, list): token = token[0]
        payload = {**data.model_dump(), "booking_id": str(uuid.uuid4()), "token": token, "status":"waiting", "checked_in":False}
        result = db_required().table("bookings").insert(payload).execute().data
    except Exception as exc: raise HTTPException(400, f"Booking failed: {exc}")
    booking = result[0]
    notify(data.farmer_id, "Slot Confirmed", f"Token {token} confirmed for {data.date}, {data.slot}.")
    return booking

@app.get("/api/bookings/{farmer_id}")
def farmer_bookings(farmer_id: str):
    return db_required().table("bookings").select("*").eq("farmer_id", farmer_id).order("created_at", desc=False).execute().data or []

@app.get("/api/queue/{centre_id}")
def get_queue(centre_id: str, user_token: Optional[str] = None): return queue_state(centre_id, user_token)

@app.get("/api/notifications/{farmer_id}")
def notifications(farmer_id: str):
    return db_required().table("notifications").select("*").eq("farmer_id", farmer_id).order("created_at", desc=True).execute().data or []

@app.get("/api/operator/{centre_id}/bookings")
def operator_bookings(centre_id: str):
    auto_skip_expired_waiting(centre_id)
    today = datetime.now().date().isoformat()
    bookings = db_required().table("bookings").select("*").eq("centre_id", centre_id).eq("date", today).execute().data or []
    bookings = _decorate_queue(bookings)
    farmer_ids = list({b.get("farmer_id") for b in bookings if b.get("farmer_id")})
    farmers = {}
    for fid in farmer_ids:
        f = first("farmers", farmer_id=fid)
        if f: farmers[fid] = f
    for b in bookings:
        b["farmer"] = farmers.get(b.get("farmer_id"))
    return bookings

@app.get("/api/operator/{centre_id}/history")
def operator_history(centre_id: str):
    """Audit-friendly completed/skipped history for the procurement operator."""
    data = db_required().table("bookings").select("*").eq("centre_id", centre_id).in_("status", ["completed", "skipped", "cancelled"]).order("created_at", desc=True).limit(200).execute().data or []
    farmer_ids = list({b.get("farmer_id") for b in data if b.get("farmer_id")})
    farmers = {fid: first("farmers", farmer_id=fid) for fid in farmer_ids}
    for b in data: b["farmer"] = farmers.get(b.get("farmer_id"))
    return data

@app.post("/api/queue/{centre_id}/action")
def queue_action(centre_id: str, data: QueueAction):
    booking = first("bookings", centre_id=centre_id, token=data.token)
    if not booking: raise HTTPException(404, "Token not found")
    if booking["date"] != datetime.now().date().isoformat(): raise HTTPException(400, "Only today's queue can be operated.")
    action = data.action.lower()
    status_map = {"serve":"serving", "serving":"serving", "complete":"procurement_pending", "next":"procurement_pending", "defer":"waiting"}
    if action == "defer":
        update = {"deferred_at": datetime.now().isoformat(), "defer_reason": "Skipped for now by procurement centre operator."}
        db_required().table("bookings").update(update).eq("booking_id", booking["booking_id"]).execute()
        notify(booking["farmer_id"], "Queue Update", f"Token {booking['token']} was skipped for now. Your booking remains active.")
        return first("bookings", booking_id=booking["booking_id"])
    if action in ("skip", "cancel"):
        update = {"status": "skipped", "skipped_at": datetime.now().isoformat(), "skip_reason": "Manually skipped by procurement centre operator."}
        db_required().table("bookings").update(update).eq("booking_id", booking["booking_id"]).execute()
        notify(booking["farmer_id"], "Queue Update", f"Token {booking['token']} was skipped by the procurement centre.")
        return first("bookings", booking_id=booking["booking_id"])
    if action not in status_map: raise HTTPException(400, "Unknown queue action")
    new_status = status_map[action]
    update = {"status":new_status}
    if action in ("serve", "serving") and not booking.get("called_at"):
        update["called_at"] = datetime.now().isoformat()
    if new_status == "procurement_pending":
        update["procurement_started_at"] = datetime.now().isoformat()
    db_required().table("bookings").update(update).eq("booking_id", booking["booking_id"]).execute()
    notify(booking["farmer_id"], "Queue Update", f"Token {booking['token']} status: {new_status}.")
    return first("bookings", booking_id=booking["booking_id"])

@app.post("/api/procurements")
def create_procurement(data: ProcurementIn):
    booking = first("bookings", farmer_id=data.farmer_id, centre_id=data.centre_id, status="procurement_pending")
    if not booking: raise HTTPException(400, "No procurement-pending booking found for this farmer at this centre.")
    existing = first("procurements", token=booking["token"], farmer_id=data.farmer_id)
    if existing: return existing
    if data.quantity_kg <= 0 or data.rate_per_kg <= 0: raise HTTPException(400, "Quantity and rate must be positive")
    amount = round(data.quantity_kg * data.rate_per_kg, 2)
    payload = {"procurement_id":str(uuid.uuid4()), "farmer_id":data.farmer_id, "centre_id":data.centre_id, "crop":data.crop,
               "quantity_kg":data.quantity_kg, "quality_grade":data.quality_grade, "rate_per_kg":data.rate_per_kg, "amount":amount, "token":booking["token"],
               "employee_id": data.employee_id, "completed_at": datetime.now().isoformat()}
    result = db_required().table("procurements").insert(payload).execute().data
    db_required().table("bookings").update({"status":"completed", "completed_at":datetime.now().isoformat()}).eq("booking_id", booking["booking_id"]).execute()
    notify(data.farmer_id, "Procurement Completed", f"Token {booking['token']}: procurement value ₹{amount:.2f}.")
    return result[0]

@app.get("/api/procurements/{farmer_id}")
def farmer_procurements(farmer_id: str): return db_required().table("procurements").select("*").eq("farmer_id", farmer_id).order("created_at", desc=True).execute().data or []

@app.get("/api/payments/{farmer_id}")
def farmer_payments(farmer_id: str): return db_required().table("payments").select("*").eq("farmer_id", farmer_id).order("created_at", desc=True).execute().data or []

@app.post("/api/payments")
def initiate_payment(data: PaymentIn):
    procurement = first("procurements", farmer_id=data.farmer_id, token=data.token)
    if not procurement: raise HTTPException(400, "Procurement not found for this token.")
    existing = first("payments", farmer_id=data.farmer_id, token=data.token)
    if existing: return existing
    payload = {"payment_id":f"DBT-{uuid.uuid4().hex[:12].upper()}", "farmer_id":data.farmer_id, "token":data.token, "status":"processing", "amount":procurement["amount"]}
    result = db_required().table("payments").insert(payload).execute().data
    notify(data.farmer_id, "DBT Initiated", f"DBT payment of ₹{float(procurement['amount']):.2f} is processing.")
    return result[0]

@app.post("/api/payments/{payment_id}/complete")
def complete_payment(payment_id: str):
    payment = first("payments", payment_id=payment_id)
    if not payment: raise HTTPException(404, "Payment not found")
    if payment["status"] == "credited": return payment
    db_required().table("payments").update({"status":"credited", "completed_at":datetime.now().isoformat()}).eq("payment_id", payment_id).execute()
    notify(payment["farmer_id"], "DBT Credited", f"₹{float(payment.get('amount') or 0):.2f} has been marked as credited for token {payment['token']}.")
    return first("payments", payment_id=payment_id)

@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str):
    booking = first("bookings", booking_id=booking_id)
    if not booking: raise HTTPException(404, "Booking not found")
    if booking["status"] != "waiting": raise HTTPException(400, "Only waiting bookings can be cancelled.")
    db_required().table("bookings").update({"status":"cancelled"}).eq("booking_id", booking_id).execute()
    notify(booking["farmer_id"], "Booking Cancelled", f"Token {booking['token']} booking has been cancelled.")
    return first("bookings", booking_id=booking_id)

@app.post("/api/bookings/{booking_id}/checkin")
def checkin_booking(booking_id: str):
    booking = first("bookings", booking_id=booking_id)
    if not booking: raise HTTPException(404, "Booking not found")
    if booking["date"] != datetime.now().date().isoformat(): raise HTTPException(400, "Check-in is available only on the booking date.")
    if booking["status"] != "waiting": raise HTTPException(400, "Only waiting bookings can be checked in.")
    db_required().table("bookings").update({"checked_in":True, "arrived_at": datetime.now().isoformat(), "deferred_at": None, "defer_reason": None}).eq("booking_id", booking_id).execute()
    notify(booking["farmer_id"], "Check-in Confirmed", f"Token {booking['token']} is checked in.")
    return first("bookings", booking_id=booking_id)

@app.get("/api/operator/{centre_id}/stats")
def operator_stats(centre_id: str):
    today = datetime.now().date().isoformat(); data = rows("bookings", centre_id=centre_id, date=today)
    return {"total":len(data), "waiting":sum(b["status"]=="waiting" for b in data), "serving":sum(b["status"]=="serving" for b in data),
            "procurement_pending":sum(b["status"]=="procurement_pending" for b in data), "completed":sum(b["status"]=="completed" for b in data),
            "cancelled":sum(b["status"]=="cancelled" for b in data)}

@app.post("/api/demo/seed")
def demo_seed():
    farmer_id = "F900001"; mobile = "9000000001"
    if not first("farmers", farmer_id=farmer_id):
        db_required().table("farmers").insert({"farmer_id":farmer_id,"mobile":mobile,"email":None,"name":"Demo Farmer","village":"Demo Village","district":"Jehanabad","crop":"Wheat","centre_id":"C014"}).execute()
    today = datetime.now().date().isoformat()
    existing = rows("bookings", farmer_id=farmer_id, date=today)
    if not existing:
        for i, slot in enumerate(SLOTS[:3]):
            token = db_required().rpc("next_mandi_token", {"p_centre_id":"C014"}).execute().data
            if isinstance(token, list): token=token[0]
            db_required().table("bookings").insert({"booking_id":str(uuid.uuid4()),"farmer_id":farmer_id,"centre_id":"C014","crop":"Wheat","quantity_kg":200+i*50,"date":today,"slot":slot,"token":token,"status":"serving" if i==0 else "waiting","checked_in":i<2}).execute()
    return {"farmer_id":farmer_id,"mobile":mobile,"centre_id":"C014","message":"Demo data seeded in Supabase"}

@app.get("/api/receipts/{farmer_id}/pdf")
def receipt_pdf(farmer_id: str):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        procurements = farmer_procurements(farmer_id)
        farmer = first("farmers", farmer_id=farmer_id)
        buf=BytesIO(); c=canvas.Canvas(buf,pagesize=A4); w,h=A4
        c.setFont("Helvetica-Bold",18); c.drawString(50,h-60,"KisanSetu e-Receipt")
        c.setFont("Helvetica",11); c.drawString(50,h-90,f"Farmer: {(farmer or {}).get('name','-')}")
        c.drawString(50,h-108,f"Farmer ID: {farmer_id}")
        y=h-150
        for p in procurements:
            c.drawString(50,y,f"Token: {p['token']} | Crop: {p['crop']} | Qty: {p['quantity_kg']} kg")
            y-=18; c.drawString(50,y,f"Rate: Rs {p['rate_per_kg']} / kg | Amount: Rs {p['amount']}"); y-=30
        if not procurements: c.drawString(50,y,"No completed procurement yet.")
        c.save(); buf.seek(0)
        return StreamingResponse(buf,media_type="application/pdf",headers={"Content-Disposition":"attachment; filename=kisansetu_receipt.pdf"})
    except Exception as exc: raise HTTPException(500, f"Receipt generation failed: {exc}")
