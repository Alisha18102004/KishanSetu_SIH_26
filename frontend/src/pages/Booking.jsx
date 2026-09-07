import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, LocateFixed, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { api, getApiError } from "../api/api";
import { today, money, haversine } from "../utils/helpers";
import { BIHAR_CENTRES } from "../data/centres";
import { Card, Pill } from "../components/UI";
import { useLanguage } from "../i18n/LanguageContext";

function Booking({ user, onBooked }) {
  const { t } = useLanguage();
  const [centres, setCentres] = useState(BIHAR_CENTRES);
  const [slots, setSlots] = useState([]);
  const [location, setLocation] = useState(null);
  const [search, setSearch] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [aiRec, setAiRec] = useState(null);
  const [f, setF] = useState({ centre_id: user?.centre_id || "C014", crop: user?.crop || "Wheat", quantity_kg: 420, date: today(), slot: "" });

  useEffect(() => {
    let cancelled = false;
    api.get("/centres").then(r => { if (!cancelled && Array.isArray(r.data) && r.data.length) setCentres(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!f.centre_id || !f.date) return;
    let cancelled = false;
    setLoadingSlots(true);
    setError("");
    api.get("/slots", { params: { centre_id: f.centre_id, booking_date: f.date } })
      .then(r => { if (!cancelled) setSlots(Array.isArray(r.data) ? r.data : []); })
      .then(() => api.get("/ai/slot-recommendation", { params: { centre_id: f.centre_id, booking_date: f.date, crop: f.crop, quantity_kg: Number(f.quantity_kg) || 0 } }))
      .then(r => { if (!cancelled) setAiRec(r.data); })
      .catch(e => { if (!cancelled) { setSlots([]); setError(getApiError(e, "Slots load nahi ho paaye.")); } })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [f.centre_id, f.date]);


  useEffect(() => {
    if (!f.centre_id || !f.date) return;
    const timer = setTimeout(() => {
      api.get("/ai/slot-recommendation", { params: { centre_id: f.centre_id, booking_date: f.date, crop: f.crop, quantity_kg: Number(f.quantity_kg) || 0 } })
        .then(r => setAiRec(r.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [f.centre_id, f.date, f.crop, f.quantity_kg]);
  const locate = () => {
    setError("");
    if (!navigator.geolocation) { setError("Is browser me GPS available nahi hai."); return; }
    navigator.geolocation.getCurrentPosition(
      p => setLocation({ lat: p.coords.latitude, lon: p.coords.longitude }),
      e => setError(e.code === 1 ? "Location permission denied. Browser me Allow karein." : "GPS location nahi mil paayi."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const sorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const withDistance = centres.map(c => ({ ...c, distance: location ? haversine(location.lat, location.lon, Number(c.lat) || 0, Number(c.lon) || 0) : null }));
    const filtered = term ? withDistance.filter(c => `${c.district || ""} ${c.city || ""} ${c.name || ""}`.toLowerCase().includes(term)) : withDistance;
    return location ? filtered.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999)) : filtered;
  }, [centres, location, search]);

  const update = (key, value) => setF(prev => ({ ...prev, [key]: value }));

  const submit = async e => {
    e.preventDefault();
    setError(""); setSuccess("");
    const qty = Number(f.quantity_kg);
    const selectedSlot = slots.find(s => s.slot === f.slot);
    if (!f.slot) { setError("Please select an available slot."); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setError("Quantity 1 kg se greater honi chahiye."); return; }
    if (!selectedSlot?.available) { setError("Selected slot full ho chuka hai. Dusra slot choose karein."); return; }
    setLoading(true);
    try {
      const r = await api.post("/bookings", { ...f, quantity_kg: qty, farmer_id: user.farmer_id });
      setSuccess(`Booking confirmed: ${r.data.token}`);
      onBooked?.(r.data);
    } catch (e) { setError(getApiError(e, "Booking failed")); }
    finally { setLoading(false); }
  };

  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:px-7 md:pb-12">
    <div className="mb-5"><Pill className="bg-emerald-100 text-emerald-800"><CalendarDays size={14}/> {t("smartSlotBooking")}</Pill><h1 className="mt-3 text-3xl font-black tracking-tight">{t("bookingTitle")}</h1><p className="mt-1 text-sm text-slate-500">Centre, crop, quantity और preferred time पहले से चुनें.</p></div>
    <div className="mb-5 flex flex-col gap-3 rounded-[20px] border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-700"><LocateFixed size={20}/></div><div className="flex-1"><b className="text-sm">Nearest centre खोजें</b><p className="text-xs text-slate-500">GPS सिर्फ distance calculate करने के लिए इस्तेमाल होगा.</p></div><button type="button" onClick={locate} className="rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 shadow-sm">{t("detectLocation")}</button></div>
    <Card className="p-5 md:p-7"><form onSubmit={submit} className="grid gap-5">
      <div><label className="ks-label">{t("selectCentre")}</label><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search district / centre" className="ks-input pl-10"/></div><select required value={f.centre_id} onChange={e=>{update("centre_id",e.target.value);update("slot","");}} className="ks-input mt-2">{sorted.length ? sorted.map(c=><option key={c.centre_id} value={c.centre_id}>{c.district} — {c.city}{c.distance!=null?` • ${c.distance.toFixed(1)} km`:""}</option>) : <option value="">No centre found</option>}</select></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="ks-label">{t("crop")}</label><select value={f.crop} onChange={e=>update("crop",e.target.value)} className="ks-input"><option>Wheat</option><option>Rice</option><option>Maize</option><option>Mustard</option></select></div><div><label className="ks-label">{t("quantity")}</label><input required type="number" min="1" step="1" value={f.quantity_kg} onChange={e=>update("quantity_kg",e.target.value)} className="ks-input"/></div><div><label className="ks-label">{t("selectDate")}</label><input required type="date" min={today()} value={f.date} onChange={e=>{update("date",e.target.value);update("slot","");}} className="ks-input"/></div><div><label className="ks-label">{t("selectSlot")}</label><select required value={f.slot} onChange={e=>update("slot",e.target.value)} className="ks-input"><option value="">{loadingSlots ? t("loading") : t("chooseSlot")}</option>{slots.map(s=><option key={s.slot} disabled={!s.available} value={s.slot}>{s.slot} — {s.available} left</option>)}</select></div></div>
      {aiRec?.results?.length>0 && (() => { const ranked=[...aiRec.results].filter(x=>x.available>0).sort((a,b)=>a.predicted_wait_min-b.predicted_wait_min); const best=ranked[0]; return best ? <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-sm text-indigo-900">🧠 AI Smart Slot Planner</b><p className="mt-1 text-xs text-slate-600">Best slot: <b>{best.slot}</b> • predicted wait <b>{best.predicted_wait_min} min</b> • {best.available} capacity left</p><p className="mt-1 text-[11px] text-slate-500">The model scores queue load, counter capacity, crop quantity and historical service time. {aiRec.training_samples} historical observations.</p></div><button type="button" onClick={()=>update("slot",best.slot)} className="rounded-xl bg-indigo-700 px-3 py-2 text-xs font-extrabold text-white">Use AI Slot</button></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{ranked.slice(0,3).map((x,i)=><button type="button" key={x.slot} onClick={()=>update("slot",x.slot)} className={`rounded-xl bg-white p-3 text-left ring-1 ${i===0?'ring-indigo-300':'ring-slate-100'}`}><span className="text-[10px] font-black text-indigo-600">#{i+1} AI PICK</span><b className="mt-1 block text-xs">{x.slot}</b><span className="text-[11px] text-slate-500">~{x.predicted_wait_min} min • {x.available} left</span></button>)}</div></div> : null; })()}
      <div className="grid gap-3 sm:grid-cols-3">{slots.map(s=><button type="button" key={s.slot} disabled={!s.available || loadingSlots} onClick={()=>update("slot",s.slot)} className={`rounded-2xl border p-3 text-left transition ${f.slot===s.slot?"border-emerald-500 bg-emerald-50":"border-slate-200 bg-white hover:border-emerald-200"} disabled:opacity-40`}><span className="block text-xs font-bold text-slate-500">{s.slot}</span><b className="mt-1 block text-sm">{s.available} slots</b></button>)}</div>
      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center"><div className="flex-1"><b className="text-sm">Estimated value</b><p className="text-xs text-slate-500">Demo rate ₹22.50/kg • final amount depends on procurement</p></div><b className="text-2xl font-black text-emerald-700">{money(Number(f.quantity_kg)*22.5)}</b></div>
      {(error || success) && <div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-bold ${error?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{error?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<span>{error || success}</span></div>}
      <button disabled={loading || loadingSlots || !f.centre_id} className="rounded-2xl bg-emerald-700 px-5 py-4 font-black text-white shadow-lg shadow-emerald-700/20 disabled:opacity-60">{loading ? "Booking..." : t("confirmBooking")} <ChevronRight className="ml-1 inline" size={18}/></button>
    </form></Card>
  </main>;
}
export default Booking;
