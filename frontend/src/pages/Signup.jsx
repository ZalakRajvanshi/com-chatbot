import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { auth } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";
import PasswordStrength from "../components/PasswordStrength";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", { name, email, password });
      // backend auto-logs you in by returning a token
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify({
        id: data.user_id,
        name: data.name,
        role: data.role,
      }));
      navigate(data.role === "admin" ? "/admin" : "/home");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create account.");
    } finally {
      setLoading(false);
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
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Communication Practice</div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-1">Create your account</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Get started with daily practice scenarios.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="you@theproductfolks.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Confirm password
            </label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
