import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api";
import Header from "../components/Header";
import ConfirmModal from "../components/ConfirmModal";

export default function AdminUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get(`/admin/user/${id}`)
      .then(({ data }) => setProfile(data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    await api.delete(`/admin/user/${id}`);
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-full">
        <Header />
        <div className="flex items-center justify-center py-32 text-zinc-400 text-sm">Loading profile...</div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-full">
        <Header />
        <div className="flex items-center justify-center py-32 text-red-500 text-sm">User not found</div>
      </div>
    );
  }

  const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <div className="min-h-full">
      <Header
        left={
          <Link
            to="/admin"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition flex items-center gap-1.5 ml-2"
          >
            ← All employees
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
        {/* Profile header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xl font-semibold flex-shrink-0">
              {profile.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold truncate">{profile.name}</h1>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{profile.email}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-900 dark:text-zinc-100 text-sm">{profile.total_sessions}</strong> sessions
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Avg <strong className="text-zinc-900 dark:text-zinc-100 text-sm">{pct(profile.avg_score)}</strong>
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  <span className="text-base align-middle">🔥</span>{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100 text-sm">{profile.streak ?? 0}</strong> day streak
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition flex-shrink-0 flex items-center gap-1.5"
            title="Delete this employee"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6M14 11v6"></path>
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span className="hidden sm:inline">Delete user</span>
          </button>
        </div>

        {/* Persona summary */}
        {profile.persona ? (
          <PersonaCard persona={profile.persona} />
        ) : (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-5 mb-6 text-center">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Persona summary unlocks after 2 completed sessions.
            </div>
          </div>
        )}

        {/* Score breakdown */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-6">
          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            Score Breakdown
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ScoreBar label="Heard" value={profile.avg_acknowledge} />
            <ScoreBar label="Clear" value={profile.avg_clarity} />
            <ScoreBar label="Action" value={profile.avg_apology} />
            <ScoreBar label="Tone" value={profile.avg_reassurance} />
          </div>
        </div>

        {/* History */}
        <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Daily History
        </div>
        <div className="space-y-3">
          {profile.sessions.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              No sessions yet.
            </div>
          ) : (
            profile.sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                expanded={expanded === s.id}
                onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              />
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this employee?"
        body={
          <>
            <p>
              <strong className="text-zinc-900 dark:text-zinc-100">{profile.name}</strong> ({profile.email})
              and <strong>all their conversation history</strong> will be permanently deleted. This cannot be undone.
            </p>
          </>
        }
        confirmText="Delete employee"
        destructive
        requireText="DELETE"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────── */

function PersonaCard({ persona }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
          Persona Summary
        </div>
        <div className="text-[10px] text-indigo-600/70 dark:text-indigo-400/60 uppercase tracking-wider">
          {persona.source === "ai" ? "AI-generated" : "Auto"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Bullet title="Strengths" items={persona.strengths} accent="text-emerald-700 dark:text-emerald-400" dot="bg-emerald-500" />
        <Bullet title="Areas to improve" items={persona.weaknesses} accent="text-amber-700 dark:text-amber-400" dot="bg-amber-500" />
      </div>

      {persona.pattern && (
        <div className="text-sm text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-900/40 rounded-lg p-3 mb-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Pattern: </span>
          {persona.pattern}
        </div>
      )}
      {persona.recommendation && (
        <div className="text-sm text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-900/40 rounded-lg p-3">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Recommend: </span>
          {persona.recommendation}
        </div>
      )}
    </div>
  );
}

function Bullet({ title, items, accent, dot }) {
  return (
    <div>
      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${accent}`}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className={`w-1.5 h-1.5 ${dot} rounded-full mt-2 flex-shrink-0`}></span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreBar({ label, value }) {
  const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const color = value == null ? "bg-zinc-300 dark:bg-zinc-700"
    : value >= 0.75 ? "bg-emerald-500"
    : value >= 0.5 ? "bg-amber-500"
    : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{label}</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pct(value)}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${(value || 0) * 100}%` }} />
      </div>
    </div>
  );
}

function ScorePill({ value, size = "sm" }) {
  if (value == null) return <span className="text-xs text-zinc-400">—</span>;
  const color = value >= 0.75
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
    : value >= 0.5
    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/50";
  const sz = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span className={`inline-block rounded-md font-semibold border ${color} ${sz}`}>
      {Math.round(value * 100)}%
    </span>
  );
}

function SessionCard({ session, expanded, onToggle }) {
  const s = session;
  const pretty = (p) => p.replace(/_/g, " ");

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
      {/* Top */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{s.date}</div>
          <div className="text-sm font-semibold mt-1">
            {s.scenario.sender_name} · {s.scenario.role_applied}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
            <span>at {s.scenario.company_name}</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-300">
              {s.scenario.difficulty}
            </span>
          </div>
        </div>
        <div className="text-right">
          <ScorePill value={s.overall_score} size="md" />
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize mt-1">{s.status}</div>
        </div>
      </div>

      {/* Daily summary */}
      {s.daily_summary && (
        <div className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3.5 mt-3 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            AI Manager Summary
          </div>
          {s.daily_summary}
        </div>
      )}

      <button
        onClick={onToggle}
        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-3 transition"
      >
        {expanded ? "Hide transcript ↑" : "View full transcript ↓"}
      </button>

      {expanded && (
        <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 animate-fade-in">
          {/* Scenario opening (sender's message) */}
          <div className="mb-5">
            <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Scenario opening
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  {s.scenario.sender_name?.[0]?.toUpperCase()}
                </div>
                <div className="text-sm font-semibold">{s.scenario.sender_name}</div>
              </div>
              <div className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3">
                {s.scenario.message}
              </div>
              {s.scenario.expected_points?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mr-1">Expected:</span>
                  {s.scenario.expected_points.map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium">
                      {pretty(p)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transcript by round */}
          <Transcript messages={s.messages} senderName={s.scenario.sender_name} />
        </div>
      )}
    </div>
  );
}

function Transcript({ messages, senderName }) {
  const pretty = (p) => p.replace(/_/g, " ");
  // Group into rounds: each round = 1 user msg + (optional) ai reply
  const rounds = [];
  let current = null;
  for (const m of messages) {
    if (m.role === "user") {
      if (current) rounds.push(current);
      current = { user: m, ai: null };
    } else if (m.role === "ai" && current) {
      current.ai = m;
    }
  }
  if (current) rounds.push(current);

  if (rounds.length === 0) {
    return (
      <div className="text-center text-sm text-zinc-400 py-6">No replies yet.</div>
    );
  }

  const initial = senderName?.[0]?.toUpperCase() || "?";

  return (
    <div className="space-y-7">
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] uppercase tracking-wider font-semibold pb-2 border-b border-dashed border-zinc-200 dark:border-zinc-800">
        <span className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-pink-500 to-orange-500"></span>
          {senderName} <span className="text-zinc-400 dark:text-zinc-500 normal-case">(simulated candidate)</span>
        </span>
        <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          HR Trainee
        </span>
      </div>

      {rounds.map((r, idx) => (
        <div key={idx}>
          {/* Round divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2">
              Round {idx + 1}
            </div>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* HR Trainee — RIGHT side */}
          <div className="flex justify-end mb-3">
            <div className="max-w-[80%]">
              <div className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1.5 text-right pr-2">
                HR Trainee said
              </div>
              <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                {r.user.content}
              </div>

              {/* Evaluation panel below the HR bubble */}
              {r.user.evaluation && (
                <div className="mt-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ScorePill value={r.user.evaluation.overall} size="sm" />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                      AI verdict: {r.user.evaluation.decision}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
                    <MiniScore label="Heard" value={r.user.evaluation.acknowledge} />
                    <MiniScore label="Clear" value={r.user.evaluation.clarity} />
                    <MiniScore label="Action" value={r.user.evaluation.apology} />
                    <MiniScore label="Tone" value={r.user.evaluation.reassurance} />
                  </div>
                  {(r.user.evaluation.points_hit?.length > 0 || r.user.evaluation.points_missed?.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.user.evaluation.points_hit.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-900/50">
                          ✓ {pretty(p)}
                        </span>
                      ))}
                      {r.user.evaluation.points_missed.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-medium border border-red-200 dark:border-red-900/50">
                          ✗ {pretty(p)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Candidate — LEFT side, with avatar */}
          {r.ai && (
            <div className="flex justify-start gap-2 items-end mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="max-w-[78%]">
                <div className="text-[10px] font-semibold text-pink-700 dark:text-pink-400 uppercase tracking-wider mb-1 ml-2">
                  {senderName} replied
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed shadow-sm text-zinc-900 dark:text-zinc-100">
                  {r.ai.content}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Use 2-column grid on phones (4 mini scores stack 2x2 nicely), 4-col on larger
function MiniScore({ label, value }) {
  const v = value ?? 0;
  const color = v >= 0.75 ? "bg-emerald-500" : v >= 0.5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-[10px] text-zinc-600 dark:text-zinc-400 mb-1">
        <span className="font-medium uppercase tracking-wider">{label}</span>
        <span className="font-semibold">{Math.round(v * 100)}</span>
      </div>
      <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}
