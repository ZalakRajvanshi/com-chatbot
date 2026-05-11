import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
    } catch {
      // intentionally swallow — backend always returns 200 to avoid leaking
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 relative">
      <div className="absolute top-6 right-6"><ThemeToggle /></div>

      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div className="text-sm font-semibold">Arova</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">by The Product Folks</div>
          </div>
        </div>

        {!submitted ? (
          <>
            <h2 className="text-2xl font-semibold mb-1">Forgot password</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="you@theproductfolks.com"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl font-semibold">
              ✓
            </div>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
              If an account exists for <strong className="text-zinc-700 dark:text-zinc-200">{email}</strong>,
              you'll receive a password reset link shortly. The link expires in 1 hour.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
