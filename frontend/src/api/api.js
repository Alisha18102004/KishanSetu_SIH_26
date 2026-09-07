import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export function getApiError(error, fallback = "Something went wrong") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(x => x?.msg).filter(Boolean).join(", ") || fallback;
  if (error?.message === "Network Error") return "Backend se connection nahi ho raha. Check karein ki FastAPI port 8000 par chal raha hai.";
  return error?.message || fallback;
}
