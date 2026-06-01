export default function PoolCardSkeleton() {
  return (
    <div className="border-[4px] border-[var(--brutal-ink)] bg-[var(--brutal-bg)] p-5 shadow-[6px_6px_0_var(--brutal-ink)] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-[var(--brutal-muted)]" />
        <div className="h-6 w-20 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)]" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-3/4 bg-[var(--brutal-muted)]" />
        <div className="h-4 w-1/2 bg-[var(--brutal-muted)]" />
        <div className="h-4 w-2/3 bg-[var(--brutal-muted)]" />
      </div>
      <div className="mt-4 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] p-3 shadow-[3px_3px_0_var(--brutal-ink)]">
        <div className="h-4 w-1/3 bg-[var(--brutal-muted)]" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-10 flex-1 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] shadow-[3px_3px_0_var(--brutal-ink)]" />
        <div className="h-10 flex-1 border-[3px] border-[var(--brutal-ink)] bg-[var(--brutal-surface)] shadow-[3px_3px_0_var(--brutal-ink)]" />
      </div>
    </div>
  );
}
