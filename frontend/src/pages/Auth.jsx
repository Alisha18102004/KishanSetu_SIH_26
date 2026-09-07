import React, { useState } from "react";
import {
  CalendarDays,
  Building2,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

import { api } from "../api/api";
import { Pill } from "../components/UI";

// ============================================================
// AUTH COMPONENT
// ============================================================

function Auth({ onLogin }) {
  // ------------------------------------------------------------
  // 1. STATE
  // ------------------------------------------------------------

  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("farmer");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [registeredId, setRegisteredId] = useState("");

  const [form, setForm] = useState({
    // Farmer login
    farmer_id: "",

    // Centre login
    employee_id: "",

    // Common
    mobile: "",

    // Farmer registration
    email: "",
    name: "",
    village: "",
    district: "Jehanabad",
    crop: "Wheat",

    // Centre registration
    centre_id: "C014",
    address: "",
    counters: 2,
  });

  // ------------------------------------------------------------
  // 2. INPUT HANDLER
  // ------------------------------------------------------------

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ------------------------------------------------------------
  // 3. ROLE CHANGE
  // ------------------------------------------------------------

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setMsg("");
    setRegisteredId("");

    // Clear login IDs when switching role
    handleChange("farmer_id", "");
    handleChange("employee_id", "");
  };

  // ------------------------------------------------------------
  // 4. MODE CHANGE
  // ------------------------------------------------------------

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setMsg("");
    setRegisteredId("");
  };

  // ------------------------------------------------------------
  // 5. VALIDATION
  // ------------------------------------------------------------

  const validateForm = () => {
    const mobile = form.mobile.trim();

    if (!/^[0-9]{10}$/.test(mobile)) {
      setMsg("Please enter a valid 10-digit mobile number.");
      return false;
    }

    // Farmer login
    if (mode === "login" && role === "farmer") {
      if (!form.farmer_id.trim()) {
        setMsg("Farmer ID is required.");
        return false;
      }
    }

    // Centre login
    if (mode === "login" && role === "centre") {
      if (!form.employee_id.trim()) {
        setMsg("Employee ID is required.");
        return false;
      }
    }

    return true;
  };

  // ------------------------------------------------------------
  // 6. SUBMIT
  // ------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      // ========================================================
      // REGISTRATION
      // ========================================================

      if (mode === "register") {
        let response;

        if (role === "farmer") {
          // Farmer registration
          response = await api.post("/farmers", {
            mobile: form.mobile.trim(),
            email: form.email.trim() || null,
            name: form.name.trim(),
            village: form.village.trim(),
            district: form.district.trim(),
            crop: form.crop,
            centre_id: form.centre_id,
          });
        } else {
          // Centre / employee registration
          response = await api.post("/centres/register", {
            employee_id: form.employee_id.trim(),
            mobile: form.mobile.trim(),
            name: form.name.trim(),
            centre_id: form.centre_id.trim(),
            district: form.district.trim(),
            address: form.address.trim(),
            counters: Number(form.counters),
          });
        }

        console.log("Registration successful:", response.data);

        // Registration does NOT auto-login. The user must now login
        // with the generated Farmer ID / registered Employee ID + mobile.
        const generatedId = role === "farmer"
          ? response.data?.farmer_id
          : response.data?.employee_id;

        setRegisteredId(generatedId || "");
        setMode("login");
        setMsg(
          role === "farmer"
            ? `Registration successful. Farmer ID: ${generatedId || "generated"}. Now login with Farmer ID + mobile.`
            : `Registration successful. Employee ID: ${generatedId || "saved"}. Now login with Employee ID + mobile.`
        );

        if (role === "farmer" && generatedId) {
          setForm((prev) => ({ ...prev, farmer_id: generatedId }));
        }
        if (role === "centre" && generatedId) {
          setForm((prev) => ({ ...prev, employee_id: generatedId }));
        }
        return;
      }

      // ========================================================
      // LOGIN
      // ========================================================

      const loginData = {
        mobile: form.mobile.trim(),
        role,
      };

      // Farmer -> Farmer ID + Mobile
      if (role === "farmer") {
        loginData.farmer_id = form.farmer_id.trim();
      }

      // Centre -> Employee ID + Mobile
      if (role === "centre") {
        loginData.employee_id = form.employee_id.trim();
      }

      console.log("Login request:", loginData);

      const response = await api.post(
        "/auth/login",
        loginData
      );

      console.log("Login successful:", response.data);

      onLogin(role, response.data.user);
    } catch (error) {
      console.error("Authentication error:", error);

      setMsg(
        error.response?.data?.detail ||
          error.message ||
          "Request failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#d9f1df,transparent_30%),radial-gradient(circle_at_90%_90%,#e7f3ed,transparent_30%),#f6faf7] p-4 md:p-8">

      {/* ========================================================
          MAIN CONTAINER
      ========================================================= */}

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">

        {/* ======================================================
            LEFT BRANDING
        ======================================================= */}

        <div className="hidden rounded-[32px] bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-10 text-white shadow-2xl lg:block">

          <Pill className="bg-white/10 text-emerald-50">
            <ShieldCheck size={14} />
            Secure procurement platform
          </Pill>

          <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.02] tracking-tight">
            KisanSetu
            <br />
            <span className="text-emerald-200">
              mandi tak aasaan.
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-emerald-50/80">
            Slot booking, live queue, procurement status aur payment
            tracking — ek hi jagah.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <CalendarDays />
              <b className="mt-3 block">Smart Slots</b>
              <small className="text-white/60">
                Pre-book your visit
              </small>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <Truck />
              <b className="mt-3 block">Live Queue</b>
              <small className="text-white/60">
                Avoid long waiting
              </small>
            </div>
          </div>
        </div>

        {/* ======================================================
            RIGHT AUTH CARD
        ======================================================= */}

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(28,61,37,.14)] md:p-8">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-emerald-800">
            <span>🌾</span>
            KisanSetu
          </div>

          <p className="mt-1 text-center text-sm text-slate-500">
            Smart Procurement & Queue Management
          </p>

          {/* ====================================================
              ROLE SELECTOR
          ===================================================== */}

          <div className="my-5 flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleRoleChange("farmer")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${
                role === "farmer"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <UserRound size={17} />
              Farmer
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("centre")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${
                role === "centre"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <Building2 size={17} />
              Procurement Centre
            </button>
          </div>

          {/* ====================================================
              LOGIN / REGISTRATION
          ===================================================== */}

          <div className="mb-4 flex rounded-xl border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${
                mode === "login"
                  ? "bg-emerald-700 text-white"
                  : "text-slate-500"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("register")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${
                mode === "register"
                  ? "bg-emerald-700 text-white"
                  : "text-slate-500"
              }`}
            >
              Registration
            </button>
          </div>

          {/* ====================================================
              FORM
          ===================================================== */}

          <form onSubmit={handleSubmit} className="grid gap-3">

            {/* ==================================================
                FARMER LOGIN - FARMER ID
            =================================================== */}

            {mode === "login" && role === "farmer" && (
              <>
                <div className="text-xs font-extrabold text-slate-500">Farmer ID</div>
                <input
                className="ks-input"
                placeholder="Farmer ID e.g. F123456"
                value={form.farmer_id}
                onChange={(e) =>
                  handleChange("farmer_id", e.target.value.toUpperCase())
                }
                required
                />
              </>
            )}

            {/* ==================================================
                CENTRE LOGIN - EMPLOYEE ID
            =================================================== */}

            {mode === "login" && role === "centre" && (
              <>
                <div className="text-xs font-extrabold text-slate-500">Employee ID</div>
                <input
                className="ks-input"
                placeholder="Employee ID e.g. EMP-1001"
                value={form.employee_id}
                onChange={(e) =>
                  handleChange(
                    "employee_id",
                    e.target.value.toUpperCase()
                  )
                }
                required
                />
              </>
            )}

            {/* ==================================================
                REGISTRATION - NAME
            =================================================== */}

            {mode === "register" && (
              <input
                className="ks-input"
                placeholder={
                  role === "farmer"
                    ? "Farmer name"
                    : "Centre manager / employee name"
                }
                value={form.name}
                onChange={(e) =>
                  handleChange("name", e.target.value)
                }
                required
              />
            )}

            {/* ==================================================
                CENTRE REGISTRATION - EMPLOYEE ID
            =================================================== */}

            {mode === "register" && role === "centre" && (
              <input
                className="ks-input"
                placeholder="Employee ID e.g. EMP-1001"
                value={form.employee_id}
                onChange={(e) =>
                  handleChange(
                    "employee_id",
                    e.target.value.toUpperCase()
                  )
                }
                required
              />
            )}

            {/* ==================================================
                MOBILE NUMBER
            =================================================== */}

            <input
              className="ks-input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Mobile number"
              value={form.mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                handleChange("mobile", value);
              }}
              required
            />

            {/* ==================================================
                FARMER REGISTRATION
            =================================================== */}

            {mode === "register" && role === "farmer" && (
              <>
                <input
                  className="ks-input"
                  type="email"
                  placeholder="Email for notifications (optional)"
                  value={form.email}
                  onChange={(e) =>
                    handleChange("email", e.target.value)
                  }
                />

                <input
                  className="ks-input"
                  placeholder="Village"
                  value={form.village}
                  onChange={(e) =>
                    handleChange("village", e.target.value)
                  }
                  required
                />

                <input
                  className="ks-input"
                  placeholder="District"
                  value={form.district}
                  onChange={(e) =>
                    handleChange("district", e.target.value)
                  }
                  required
                />

                <select
                  className="ks-input"
                  value={form.crop}
                  onChange={(e) =>
                    handleChange("crop", e.target.value)
                  }
                >
                  <option value="Wheat">Wheat</option>
                  <option value="Rice">Rice</option>
                  <option value="Maize">Maize</option>
                  <option value="Mustard">Mustard</option>
                </select>
              </>
            )}

            {/* ==================================================
                CENTRE REGISTRATION
            =================================================== */}

            {mode === "register" && role === "centre" && (
              <>
                <input
                  className="ks-input"
                  placeholder="Centre ID e.g. C014"
                  value={form.centre_id}
                  onChange={(e) =>
                    handleChange(
                      "centre_id",
                      e.target.value.toUpperCase()
                    )
                  }
                  required
                />

                <input
                  className="ks-input"
                  placeholder="District"
                  value={form.district}
                  onChange={(e) =>
                    handleChange("district", e.target.value)
                  }
                  required
                />

                <input
                  className="ks-input"
                  placeholder="Centre address"
                  value={form.address}
                  onChange={(e) =>
                    handleChange("address", e.target.value)
                  }
                  required
                />

                <input
                  className="ks-input"
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Number of counters"
                  value={form.counters}
                  onChange={(e) =>
                    handleChange(
                      "counters",
                      Number(e.target.value)
                    )
                  }
                />
              </>
            )}

            {/* ==================================================
                SUBMIT
            =================================================== */}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-xl bg-emerald-700 px-4 py-3.5 font-extrabold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create account"}
            </button>

            {/* ==================================================
                ERROR
            =================================================== */}

            {msg && (
              <div className={`rounded-xl p-3 text-xs font-semibold ${
                registeredId ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
              }`}>
                {msg}
                {registeredId && (
                  <div className="mt-2 rounded-lg bg-white px-3 py-2 font-black tracking-wide ring-1 ring-emerald-100">
                    {role === "farmer" ? "Farmer ID" : "Employee ID"}: {registeredId}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* ====================================================
              FOOTER MESSAGE
          ===================================================== */}

          <p className="mt-4 text-center text-xs text-slate-400">
            {mode === "login" && role === "farmer"
              ? "Farmer login requires Farmer ID + registered mobile number."
              : mode === "login" && role === "centre"
              ? "Procurement login requires Employee ID + registered mobile number."
              : "Register first, then login using your registered ID and mobile number."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
