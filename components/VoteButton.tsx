"use client";

// Upvote button (STAGE 1: optimistic UI + per-client cooldown enforced
// server-side). STAGE 3 will make votes durable and deduplicated per visitor.

import { useEffect, useRef, useState } from "react";

interface Props {
  reportId: string;
  initialCount: number;
}

export default function VoteButton({ reportId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleVote() {
    if (pending) return;

    setError(null);
    setPending(true);
    setCount((c) => c + 1); // optimistic; rolled back on failure
    setVoted(true);

    try {
      const response = await fetch(`/api/reports/${reportId}/vote`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        voteCount?: number;
        error?: string;
      };

      if (response.ok && data.ok && typeof data.voteCount === "number") {
        setCount(data.voteCount); // reconcile with the server
      } else {
        setCount((c) => Math.max(initialCount, c - 1));
        setVoted(false);
        setError(data.error ?? "Vote failed — please try again.");
      }
    } catch {
      setCount((c) => Math.max(initialCount, c - 1));
      setVoted(false);
      setError("Network error — vote not recorded.");
    } finally {
      setPending(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setError(null), 4000);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleVote}
        disabled={voted || pending}
        aria-label={
          voted
            ? `You upvoted this report. ${count} total votes.`
            : `Upvote this report. Currently ${count} votes.`
        }
        className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
          voted
            ? "cursor-default bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
            : "bg-amber-400 text-navy-900 shadow-sm hover:bg-amber-300 disabled:opacity-70"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M10 3l6 7h-3.5v7h-5v-7H4l6-7z" />
        </svg>
        {voted ? "Voted" : "Upvote"}
        <span
          aria-hidden="true"
          className="rounded-md bg-white/60 px-1.5 py-0.5 tabular-nums"
        >
          {count}
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
