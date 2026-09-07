export const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

let preferredVoice = null;
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const pick = () => {
    const voices = window.speechSynthesis.getVoices();
    preferredVoice = voices.find(v => /^hi-IN$/i.test(v.lang)) || voices.find(v => /^hi/i.test(v.lang)) || voices.find(v => /^en-IN$/i.test(v.lang)) || voices[0] || null;
  };
  pick();
  window.speechSynthesis.onvoiceschanged = pick;
}

export function speak(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const Utterance = window.SpeechSynthesisUtterance;
  if (!Utterance) return false;
  window.speechSynthesis.cancel();
  const u = new Utterance(text);
  u.lang = "hi-IN";
  u.rate = 0.98;
  u.volume = 1;
  if (preferredVoice) u.voice = preferredVoice;
  window.speechSynthesis.speak(u);
  return true;
}

export function localBot(q) {
  const text = String(q || "").toLowerCase();
  if (/token|queue|number/.test(text)) return "Aapka token aur queue Home page par live update hota hai. Token ke paas 2 se kam farmers hon to centre ki taraf nikal sakte hain.";
  if (/slot|booking|book/.test(text)) return "Book Slot mein centre, date, quantity aur available time slot select kijiye.";
  if (/payment|paise|paisa|dbt/.test(text)) return "Procurement complete hone ke baad Payment page par DBT status aur amount dikhega.";
  if (/receipt|parchi/.test(text)) return "Payment page se e-receipt PDF download ki ja sakti hai.";
  if (/centre|mandi|location/.test(text)) return "Location detect karke KisanSetu nearest procurement centre aur distance dikhata hai.";
  return "Main KisanSetu help bot hoon. Token, slot, queue, centre, payment ya receipt ke baare mein poochiye.";
}
