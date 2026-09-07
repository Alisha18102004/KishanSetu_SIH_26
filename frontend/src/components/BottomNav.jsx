import React from "react";
import { Home as HomeIcon, Ticket, Wallet, CalendarDays, ClipboardCheck, UserRound } from "lucide-react";
import { useLanguage } from '../i18n/LanguageContext';

function BottomNav({ page, setPage, role }) {
  const { t, language } = useLanguage();
  const items = role === "farmer"
    ? [["Home", HomeIcon, t("home")], ["Book Slot", CalendarDays, t("bookSlot")], ["Queue", Ticket, t("queue")], ["Payments", Wallet, t("payments")], ["Profile", UserRound, language === "hi" ? "प्रोफाइल" : "Profile"]]
    : [["Dashboard", HomeIcon, t("dashboard")], ["Queue", Ticket, t("queue")], ["Procurement", ClipboardCheck, t("procurement")], ["Profile", UserRound, language === "hi" ? "प्रोफाइल" : "Profile"]];

  return <nav className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_25px_rgba(16,55,34,.08)] backdrop-blur md:hidden" aria-label="Mobile navigation">
    <div className="mx-auto flex max-w-md justify-around">
      {items.map(([name, Icon, label]) => <button type="button" key={name} onClick={() => setPage(name)} aria-current={page === name ? "page" : undefined} className={`flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold transition ${page === name ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}>
        <Icon size={21} strokeWidth={page === name ? 2.5 : 2} />
        <span>{label}</span>
      </button>)}
    </div>
  </nav>;
}
export default BottomNav;
