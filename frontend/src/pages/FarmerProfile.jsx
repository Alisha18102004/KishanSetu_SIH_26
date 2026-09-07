import React, { useEffect, useMemo, useState } from "react";
import { UserRound, Phone, Mail, MapPin, Sprout, Building2, Pencil, Save, X, ShieldCheck, Ticket, CalendarDays, ArrowLeft, Copy, Check } from "lucide-react";
import { api, getApiError } from "../api/api";
import { Card, Pill } from "../components/UI";
import { useLanguage } from "../i18n/LanguageContext";

const CROPS = ["Wheat", "Rice", "Maize", "Mustard"];

export default function FarmerProfile({ user, onBack, onUserUpdate }) {
  const { language } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", village: user?.village || "", district: user?.district || "", crop: user?.crop || "Wheat" });
  const [bookings, setBookings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setForm({ name: user?.name || "", email: user?.email || "", village: user?.village || "", district: user?.district || "", crop: user?.crop || "Wheat" });
    api.get(`/bookings/${user.farmer_id}`).then(r => setBookings(Array.isArray(r.data) ? r.data : [])).catch(() => setBookings([]));
  }, [user]);

  const active = useMemo(() => bookings.filter(b => ["waiting", "serving", "procurement_pending"].includes(b.status)), [bookings]);
  const latest = bookings.at(-1);
  const copyId = async () => {
    try { await navigator.clipboard.writeText(user.farmer_id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const save = async () => {
    setMsg(""); setSaving(true);
    try {
      const res = await api.patch(`/farmers/${user.farmer_id}`, form);
      onUserUpdate?.(res.data);
      setEditing(false);
      setMsg(language === "hi" ? "Profile successfully update ho gaya." : "Profile updated successfully.");
    } catch (e) { setMsg(getApiError(e, language === "hi" ? "Profile update nahi ho paya." : "Could not update profile.")); }
    finally { setSaving(false); }
  };
  const cancel = () => { setForm({ name: user?.name || "", email: user?.email || "", village: user?.village || "", district: user?.district || "", crop: user?.crop || "Wheat" }); setEditing(false); setMsg(""); };

  const labels = language === "hi" ? {
    title: "किसान प्रोफाइल", subtitle: "आपकी व्यक्तिगत और मंडी जानकारी",
    edit: "प्रोफाइल एडिट करें", save: "सेव करें", cancel: "रद्द करें", farmerId: "किसान ID", mobile: "मोबाइल नंबर", email: "ईमेल", name: "नाम", village: "गांव", district: "जिला", crop: "फसल", centre: "पसंदीदा क्रय केंद्र", account: "अकाउंट जानकारी", created: "रजिस्ट्रेशन", bookings: "कुल बुकिंग", active: "सक्रिय बुकिंग", latest: "अंतिम बुकिंग", secure: "आपकी प्रोफाइल जानकारी सुरक्षित है", noBooking: "अभी कोई बुकिंग नहीं", copied: "Copied!"
  } : {
    title: "Farmer Profile", subtitle: "Your personal and mandi information",
    edit: "Edit Profile", save: "Save Changes", cancel: "Cancel", farmerId: "Farmer ID", mobile: "Mobile Number", email: "Email", name: "Name", village: "Village", district: "District", crop: "Crop", centre: "Preferred Procurement Centre", account: "Account Information", created: "Registered", bookings: "Total Bookings", active: "Active Bookings", latest: "Latest Booking", secure: "Your profile information is protected", noBooking: "No bookings yet", copied: "Copied!"
  };

  const Field = ({ icon: Icon, label, value, name, type = "text", options }) => editing ? (
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>{options ? <select className="ks-input w-full" value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })}>{options.map(x => <option key={x}>{x}</option>)}</select> : <div className="relative"><Icon size={17} className="absolute left-3 top-3.5 text-emerald-700"/><input className="ks-input w-full pl-10" type={type} value={form[name] ?? ""} onChange={e => setForm({ ...form, [name]: e.target.value })} required={name !== "email"}/></div>}</label>
  ) : <div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Icon size={16} className="text-emerald-700"/>{label}</div><div className="mt-2 break-words text-sm font-extrabold text-slate-900">{value || "—"}</div></div>;

  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:px-7 md:pb-12 md:pt-8">
    <div className="mb-5 flex items-center gap-3"><button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Back"><ArrowLeft size={19}/></button><div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">{labels.title}</h1><p className="mt-1 text-sm text-slate-500">{labels.subtitle}</p></div></div>

    <Card className="overflow-hidden"><div className="bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-white md:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl ring-1 ring-white/20"><UserRound size={30}/></div><div><div className="text-xl font-black">{user.name}</div><div className="mt-1 text-sm text-emerald-100">{user.village}, {user.district}</div><div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"><ShieldCheck size={14}/> {labels.secure}</div></div></div>{!editing ? <button onClick={() => { setMsg(""); setEditing(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-emerald-800"><Pencil size={16}/> {labels.edit}</button> : <div className="flex gap-2"><button onClick={cancel} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-extrabold text-white ring-1 ring-white/20"><X size={16}/> {labels.cancel}</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-extrabold text-emerald-950"><Save size={16}/> {saving ? "Saving..." : labels.save}</button></div>}</div></div>
      <div className="p-5 md:p-7">
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-bold text-emerald-700">{labels.farmerId}</div><div className="mt-1 text-2xl font-black tracking-wider text-emerald-900">{user.farmer_id}</div></div><button onClick={copyId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-700 ring-1 ring-emerald-100">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? labels.copied : "Copy ID"}</button></div>
        <div className="grid gap-4 md:grid-cols-2"><Field icon={UserRound} label={labels.name} value={user.name} name="name"/><Field icon={Phone} label={labels.mobile} value={user.mobile} name="mobile"/><Field icon={Mail} label={labels.email} value={user.email} name="email" type="email"/><Field icon={MapPin} label={labels.village} value={user.village} name="village"/><Field icon={MapPin} label={labels.district} value={user.district} name="district"/><Field icon={Sprout} label={labels.crop} value={user.crop} name="crop" options={CROPS}/></div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Building2 size={16} className="text-emerald-700"/>{labels.centre}</div><div className="mt-2 text-sm font-extrabold text-slate-900">{user.centre_id || "C014"} <span className="font-semibold text-slate-500">• {user.district || "Bihar"} Procurement Centre</span></div><p className="mt-1 text-xs text-slate-500">Centre ID booking ke liye use hota hai.</p></div>
        {msg && <div className={`mt-4 rounded-xl p-3 text-sm font-semibold ${msg.includes("failed") || msg.includes("nahi") || msg.includes("Could") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{msg}</div>}
      </div></Card>

    <div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays size={17} className="text-emerald-700"/>{labels.bookings}</div><div className="mt-3 text-3xl font-black">{bookings.length}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Ticket size={17} className="text-emerald-700"/>{labels.active}</div><div className="mt-3 text-3xl font-black text-emerald-700">{active.length}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-bold text-slate-500">{labels.latest}</div><div className="mt-3 text-2xl font-black">{latest?.token || "—"}</div><div className="mt-1 text-xs font-semibold text-slate-500">{latest ? `${latest.date} • ${latest.slot}` : labels.noBooking}</div></div></div>
  </main>;
}
