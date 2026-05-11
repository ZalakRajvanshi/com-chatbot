import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await auth.login(email, password);
      navigate(data.role === "admin" ? "/admin" : "/home");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-violet-400 rounded-full mix-blend-overlay blur-3xl"></div>
        </div>
        <div className="relative z-10 flex flex-col p-10 xl:p-14 text-white w-full">
          {/* Logo + Title */}
          <div className="mb-10">
            <div className="mb-7">
              <Logo size={64} />
            </div>
            <h1 className="text-4xl xl:text-5xl font-semibold leading-[1.1] tracking-tight">
              Think. Respond.
              <br />
              <span className="text-indigo-200">Improve.</span>
            </h1>
            <p className="text-base text-indigo-100/80 mt-5 max-w-md leading-relaxed">
              Designed to help you handle situations with clarity and stronger responses.
            </p>
          </div>

          {/* Chat preview mockup — bigger */}
          <div className="w-full max-w-xl">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-2xl">
              {/* Scenario card */}
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                    A
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Aarav</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <span>Senior PM</span>
                      <span className="opacity-50">·</span>
                      <span className="px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-700 font-medium">Swiggy</span>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-zinc-700">
                  Hi, I applied for the Senior PM role 2 weeks ago and haven't heard anything. Just wanted to check in on the status.
                </p>
              </div>

              {/* HR reply */}
              <div className="flex justify-end mb-3">
                <div className="bg-indigo-600 text-white text-[13px] leading-relaxed px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] shadow-md">
                  Hi Aarav, thanks for reaching out. Let me check with the Swiggy team and get back to you with a clear update by end of day today.
                </div>
              </div>

              {/* AI reply (candidate) */}
              <div className="flex items-end gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                  A
                </div>
                <div className="bg-white text-[13px] leading-relaxed px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[85%] shadow-sm text-zinc-800">
                  Thanks, that means a lot. Looking forward to hearing back from you.
                </div>
              </div>

              {/* Score line */}
              <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="font-medium">Strong response</span>
                </div>
                <span className="font-semibold text-sm">82%</span>
              </div>
            </div>

            {/* Tagline below mockup */}
            <div className="mt-5 text-sm text-indigo-100/70 text-center">
              Type your reply · AI evaluates · Track progress
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Logo size={36} />
            <div>
              <div className="text-sm font-semibold">Arova</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Communication Practice</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
            Sign in to start today's scenario
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="text"
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
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center justify-between pt-1">
              <Link
                to="/forgot-password"
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Forgot password?
              </Link>
              <Link
                to="/signup"
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Create an account →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
