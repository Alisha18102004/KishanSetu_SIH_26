import React, { useEffect, useState } from "react";
import { Building2, Settings, AlertCircle, RefreshCw, UserRound, Clock3, CheckCircle2, XCircle, History, BrainCircuit, TriangleAlert, TrendingUp, Gauge } from "lucide-react";
import { api, getApiError } from "../api/api";
import { money } from "../utils/helpers";
import { Card, Pill } from "../components/UI";

const fmt = (v) => v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function Operator({ user, page = "Dashboard" }) {
  const [bs, setBs] = useState([]);
  const [history, setHistory] = useState([]);
  const [centre, setCentre] = useState(user?.centre_id || "C014");
  const [form, setForm] = useState({ crop: "Wheat", quality_grade: "FAQ", rate_per_kg: 22.5 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [ai, setAi] = useState(null);

  const load = async () => {
    try {
      setError("");
      const [q, h, a] = await Promise.all([
        api.get(`/operator/${centre}/bookings`),
        api.get(`/operator/${centre}/history`),
        api.get(`/ai/centre-insights`, { params: { centre_id: centre } }),
      ]);
      setBs(Array.isArray(q.data) ? q.data : []);
      setHistory(Array.isArray(h.data) ? h.data : []);
      setAi(a.data || null);
    } catch (e) { setError(getApiError(e, "Queue data load nahi ho paaya.")); }
  };

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [centre]);

  const act = async (token, action) => {
    setBusy(`${action}:${token}`); setError("");
    try { await api.post(`/queue/${centre}/action`, { token, action }); await load(); }
    catch (e) { setError(getApiError(e, "Queue action failed.")); }
    finally { setBusy(""); }
  };

  const makeProc = async (b) => {
    setBusy(`proc:${b.booking_id}`); setError("");
    try {
      await api.post("/procurements", {
        farmer_id: b.farmer_id, centre_id: centre, crop: b.crop,
        quantity_kg: b.quantity_kg, quality_grade: form.quality_grade,
        rate_per_kg: Number(form.rate_per_kg), employee_id: user?.employee_id || null,
      });
      await load();
    } catch (e) { setError(getApiError(e, "Procurement save nahi hua.")); }
    finally { setBusy(""); }
  };

  const active = bs.filter(x => ["waiting", "serving", "procurement_pending"].includes(x.status));
  const recommended = active.find(x => x.status === "waiting" && x.eligible_now && !x.deferred_at);
  const waiting = active.filter(x => x.status === "waiting");
  const serving = active.filter(x => x.status === "serving");
  const pending = active.filter(x => x.status === "procurement_pending");
  const completed = history.filter(x => x.status === "completed");
  const skipped = history.filter(x => ["skipped", "cancelled"].includes(x.status));

  const FarmerDetails = ({ b }) => (
    <div className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-xs font-black text-slate-500"><UserRound size={15} className="text-emerald-700"/> Farmer Details</div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div><span className="text-slate-400">Farmer ID</span><b className="block text-slate-900">{b.farmer_id}</b></div>
        <div><span className="text-slate-400">Name</span><b className="block text-slate-900">{b.farmer?.name || "—"}</b></div>
        <div><span className="text-slate-400">Mobile</span><b className="block text-slate-900">{b.farmer?.mobile || "—"}</b></div>
        <div><span className="text-slate-400">Village / District</span><b className="block text-slate-900">{b.farmer?.village || "—"} / {b.farmer?.district || "—"}</b></div>
      </div>
    </div>
  );

  const statusClass = s => s === "serving" ? "bg-orange-100 text-orange-800" : s === "procurement_pending" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800";

  return <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-7 md:pb-12">
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div><Pill className="bg-emerald-100 text-emerald-800"><Building2 size={14}/> Operator Console</Pill><h1 className="mt-3 text-3xl font-black">Procurement Centre Dashboard</h1><p className="mt-1 text-sm text-slate-500">Live queue, farmer details, procurement completion aur complete audit history.</p></div>
      <select value={centre} onChange={e=>setCentre(e.target.value)} className="ks-input max-w-xs" disabled={!!user?.centre_id}><option value={user?.centre_id || "C014"}>{user?.centre_id || "C014"}</option></select>
    </div>
    {error && <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"><AlertCircle size={18}/>{error}</div>}

    {page === "Dashboard" && ai && <Card className="mt-5 overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <div className="border-b border-indigo-100 p-5"><div className="flex items-center gap-2"><BrainCircuit size={20} className="text-indigo-700"/><b>AI Mandi Intelligence</b><Pill className="ml-auto bg-white text-indigo-700">{ai.risk_level} Risk</Pill></div><p className="mt-1 text-xs text-slate-500">Explainable predictions using live queue load, recent demand and service history — no external AI API required.</p></div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><Gauge size={18} className="text-emerald-700"/><b className="mt-2 block text-2xl">{ai.congestion_score}%</b><span className="text-xs text-slate-500">Congestion score</span></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><TrendingUp size={18} className="text-indigo-700"/><b className="mt-2 block text-2xl">{ai.forecast_next_day}</b><span className="text-xs text-slate-500">Forecast next-day bookings</span></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><Clock3 size={18} className="text-orange-700"/><b className="mt-2 block text-2xl">{ai.avg_wait_min} min</b><span className="text-xs text-slate-500">Historical avg wait</span></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><Building2 size={18} className="text-emerald-700"/><b className="mt-2 block text-2xl">{ai.recommended_counters}</b><span className="text-xs text-slate-500">AI recommended counters</span></div>
      </div>
      <div className="grid gap-2 px-5 pb-5 md:grid-cols-2">{(ai.alerts||[]).map((x,i)=><div key={i} className="flex items-start gap-2 rounded-xl bg-white/80 p-3 text-xs text-slate-700 ring-1 ring-slate-100"><TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600"/>{x}</div>)}{ai.anomalies?.length>0&&<div className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">⚠️ {ai.anomalies.length} unusual wait record(s) flagged for operator review.</div>}</div>
    </Card>}

    {page === "Dashboard" && <div className="grid gap-3 sm:grid-cols-5">
      {[["Live",active.length,"bg-emerald-800 text-white"],["Waiting",waiting.length,"bg-white"],["Serving",serving.length,"bg-white"],["Completed",completed.length,"bg-white"],["Skipped",skipped.length,"bg-white"]].map(([a,n,c])=><div key={a} className={`rounded-2xl p-4 shadow-sm ring-1 ring-slate-200 ${c}`}><span className="text-xs opacity-70">{a}</span><b className="mt-2 block text-3xl">{n}</b></div>)}
    </div>}

    <Card className="mt-5 overflow-hidden" id="operator-queue">
      <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><b>Live Token Queue</b><p className="mt-1 text-xs text-slate-400">Dynamic slot-aware ranking — one no-show never blocks the queue.</p></div><button onClick={load} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold"><RefreshCw size={15} className="mr-1 inline"/> Refresh</button></div>
      {recommended && <div className="m-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-xs font-black uppercase tracking-wide text-emerald-700">Recommended Next Farmer</div><div className="mt-1 text-xl font-black text-slate-900">{recommended.token} • {recommended.farmer?.name || recommended.farmer_id}</div><div className="mt-1 text-xs text-slate-600">Slot {recommended.slot} • {recommended.crop} • {recommended.quantity_kg} kg • {recommended.checked_in ? "Checked-in" : "Slot active"}</div></div>
          <button disabled={!!busy} onClick={()=>act(recommended.token,"serve")} className="rounded-xl bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white">{busy===`serve:${recommended.token}`?"Calling...":"Call Recommended Farmer"}</button>
        </div>
      </div>}
      {active.length===0?<p className="p-10 text-center text-sm text-slate-400">No active farmers in queue.</p>:active.map(b=><div key={b.booking_id} className="border-b border-slate-100 p-5 last:border-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-xl font-black">#{b.queue_rank || "—"} · {b.token}</strong><Pill className={statusClass(b.status)}>{b.status}</Pill></div><span className="mt-1 block text-xs text-slate-400">{b.crop} • {b.quantity_kg} kg • Slot {b.slot} • {b.queue_priority || "waiting"}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={13}/> Booked {fmt(b.created_at)} {b.called_at && `• Called ${fmt(b.called_at)}`}</span></div>
        <div className="flex flex-wrap gap-2">{b.status==='waiting'&&<>{b.eligible_now&&!b.deferred_at?<button disabled={!!busy} onClick={()=>act(b.token,'serve')} className="rounded-xl bg-indigo-100 px-3 py-2.5 text-xs font-extrabold">{busy===`serve:${b.token}`?"Calling...":"Call Token"}</button>:<span className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500">{b.deferred_at?"Skipped for now":"Upcoming slot"}</span>}<button disabled={!!busy} onClick={()=>act(b.token,'defer')} className="rounded-xl bg-amber-100 px-3 py-2.5 text-xs font-extrabold text-amber-800">Skip for Now</button></>}{b.status==='serving'&&<><button disabled={!!busy} onClick={()=>act(b.token,'skip')} className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold">Skip</button><button disabled={!!busy} onClick={()=>act(b.token,'complete')} className="rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-extrabold text-white">{busy===`complete:${b.token}`?"Moving...":"Move to Procurement"}</button></>}{b.status==='procurement_pending'&&<button disabled={!!busy} onClick={()=>makeProc(b)} className="rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-extrabold text-white">{busy===`proc:${b.booking_id}`?"Saving...":`Complete & Save ${money(Number(b.quantity_kg)*Number(form.rate_per_kg||0))}`}</button>}</div></div>
        <FarmerDetails b={b}/>
      </div>)}
    </Card>

    {(page === "Procurement" || page === "Dashboard") && <Card id="operator-proc" className="mt-5 p-5"><div className="flex items-center gap-2"><Settings size={18} className="text-emerald-700"/><b>Procurement defaults</b></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="ks-label">Crop<select className="ks-input mt-1" value={form.crop} onChange={e=>setForm({...form,crop:e.target.value})}><option>Wheat</option><option>Rice</option><option>Maize</option><option>Mustard</option></select></label><label className="ks-label">Rate / kg<input className="ks-input mt-1" type="number" min="0" step="0.01" value={form.rate_per_kg} onChange={e=>setForm({...form,rate_per_kg:e.target.value})}/></label><label className="ks-label">Quality Grade<select className="ks-input mt-1" value={form.quality_grade} onChange={e=>setForm({...form,quality_grade:e.target.value})}><option>FAQ</option><option>Grade A</option><option>Grade B</option></select></label></div></Card>}

    <Card className="mt-5 overflow-hidden" id="operator-history">
      <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><History size={18} className="text-emerald-700"/><b>Farmer Service History / Audit Log</b></div><p className="mt-1 text-xs text-slate-400">Completed aur auto/manual skipped farmers ka permanent record.</p></div>
      {history.length===0?<p className="p-10 text-center text-sm text-slate-400">No completed or skipped record yet.</p>:history.map(b=><div key={b.booking_id} className="border-b border-slate-100 p-5 last:border-0"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><b className="text-lg">{b.token}</b><Pill className={b.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{b.status}</Pill></div><div className="mt-1 text-xs text-slate-500">{b.crop} • {b.quantity_kg} kg • Slot {b.slot}</div><div className="mt-2 grid gap-1 text-xs text-slate-500"><span>Booked: {fmt(b.created_at)}</span>{b.called_at&&<span>Called: {fmt(b.called_at)}</span>}{b.completed_at&&<span className="font-bold text-emerald-700">Completed: {fmt(b.completed_at)}</span>}{b.skipped_at&&<span className="font-bold text-amber-700">Skipped: {fmt(b.skipped_at)}</span>}{b.skip_reason&&<span>Reason: {b.skip_reason}</span>}</div></div><div className="min-w-[280px]"><FarmerDetails b={b}/></div></div></div>)}
    </Card>
  </main>;
}
export default Operator;
