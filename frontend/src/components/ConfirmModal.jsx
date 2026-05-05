import { useState } from "react";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  requireText = null, // if set, user must type this exact string to enable confirm
}) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const canConfirm = !requireText || typed === requireText;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm();
      setTyped("");
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setTyped("");
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={close}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{body}</div>

          {requireText && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Type <strong className="font-mono text-red-600 dark:text-red-400">{requireText}</strong> to confirm
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 text-sm rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || submitting}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                destructive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {submitting ? "..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
