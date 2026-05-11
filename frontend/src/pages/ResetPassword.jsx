import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/auth/reset-password/${token}/check`)
      .then(({ data }) => {
        setValid(data.valid);
        setEmail(data.email || "");
      })
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pwd.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (pwd !== confirmPwd) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pwd });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not reset password.");
    } finally {
      setSubmitting(false);
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

        {checking ? (
          <div className="text-center py-12 text-sm text-zinc-400">Verifying link...</div>
        ) : !valid ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 text-2xl font-semibold">
              ✕
            </div>
            <h2 className="text-xl font-semibold mb-2">Link invalid or expired</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
              This reset link is no longer valid. Request a new one to try again.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block mt-6 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl font-semibold">
              ✓
            </div>
            <h2 className="text-xl font-semibold mb-2">Password updated</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Redirecting you to login...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-1">Set a new password</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              For <strong className="text-zinc-700 dark:text-zinc-200">{email}</strong>
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  New password
                </label>
                <PasswordInput
                  value={pwd}
                  onChange={setPwd}
                  required
                  autoFocus
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Confirm new password
                </label>
                <PasswordInput
                  value={confirmPwd}
                  onChange={setConfirmPwd}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-60"
              >
                {submitting ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
