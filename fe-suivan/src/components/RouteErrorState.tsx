"use client";

import { AlertTriangle } from "lucide-react";

type RouteErrorStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  reset: () => void;
};

export default function RouteErrorState({
  eyebrow,
  title,
  description,
  reset,
}: RouteErrorStateProps) {
  return (
    <main className="min-h-screen bg-[var(--brutal-bg)] text-[var(--brutal-ink)]">
      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="protocol-font inline-flex items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--danger-soft)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0_var(--brutal-ink)]">
            <AlertTriangle className="size-4" />
            {eyebrow}
          </p>
          <h1
            className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] md:text-7xl"
            style={{ fontFamily: "'Bebas Neue', system-ui, sans-serif", color: "var(--brutal-ink)" }}
          >
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--brutal-muted)]">
            {description}
          </p>
          <button
            onClick={reset}
            className="protocol-font mt-8 inline-flex min-h-[44px] items-center gap-2 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-accent)] px-6 py-3 text-sm font-black text-[var(--brutal-ink)] shadow-[4px_4px_0_var(--brutal-ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            Try Again
          </button>
        </div>
      </section>
    </main>
  );
}
