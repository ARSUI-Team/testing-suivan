"use client";

export function SkeletonBlock({
  className = "",
  width,
  height,
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-[var(--brutal-muted)] ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[8px_8px_0_#0a0a0a] overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: "radial-gradient(#0a0a0a 1px, transparent 1px)",
          backgroundSize: "4px 4px",
          opacity: 0.05,
        }}
      />
      <div className="relative z-20">{children}</div>
    </div>
  );
}

export function PageHeroSkeleton({
  badgeWidth = 120,
  titleLines = 1,
  subtitleWidth = 480,
}: {
  badgeWidth?: number;
  titleLines?: number;
  subtitleWidth?: number;
}) {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]" />
      <div className="mx-auto max-w-6xl">
        <SkeletonBlock
          className="inline-flex h-10 border-[3px] border-[#0a0a0a]"
          width={`${badgeWidth}px`}
        />
        {Array.from({ length: titleLines }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="mt-3 h-12 md:h-16"
            width={i === 0 ? "70%" : "50%"}
          />
        ))}
        <SkeletonBlock className="mt-6 h-6" width={`${subtitleWidth}px`} />
      </div>
    </section>
  );
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <SkeletonBlock className="h-2" width="32px" />
              <SkeletonBlock className="h-3" width="20px" />
            </div>
            <SkeletonBlock className="mb-2 h-5" width="24px" />
            <SkeletonBlock className="h-8" width="60%" />
            <SkeletonBlock className="mt-2 h-3" width="40%" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}
