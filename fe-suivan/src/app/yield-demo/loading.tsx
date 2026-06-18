import { SkeletonBlock, SkeletonCard, PageHeroSkeleton } from "@/components/Skeleton";
import Header from "@/components/Header";

export default function YieldDemoLoading() {
  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />
      <PageHeroSkeleton badgeWidth={150} subtitleWidth={560} />

      {/* Stat cards */}
      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i}>
                <div className="p-6">
                  <SkeletonBlock className="mb-2 h-3" width="80px" />
                  <SkeletonBlock className="mb-1 h-10" width="120px" />
                  <SkeletonBlock className="h-3" width="140px" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </section>

      {/* DeepBook panel */}
      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden border-[3px] border-[#0a0a0a] bg-[#fdfdfa] shadow-[12px_12px_0_#0a0a0a]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-[#0a0a0a] p-6">
              <div>
                <SkeletonBlock className="mb-1 h-6" width="200px" />
                <SkeletonBlock className="h-3" width="160px" />
              </div>
              <SkeletonBlock className="h-10" width="140px" />
            </div>

            {/* 4 stat cards */}
            <div className="grid gap-4 p-6 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-[3px] border-[#0a0a0a] bg-[var(--background)] p-4">
                  <SkeletonBlock className="mb-1 h-3" width="60px" />
                  <SkeletonBlock className="mb-1 h-7" width="80px" />
                  <SkeletonBlock className="h-3" width="50px" />
                </div>
              ))}
            </div>

            {/* Orderbook skeleton */}
            <div className="grid gap-0 border-t-[3px] border-[#0a0a0a] md:grid-cols-2">
              {["Bids", "Asks"].map((label) => (
                <div key={label} className="p-4">
                  <SkeletonBlock className="mb-3 h-3" width="40px" />
                  <div className="space-y-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between bg-[var(--background)] px-3 py-1.5">
                        <SkeletonBlock className="h-3" width="80px" />
                        <SkeletonBlock className="h-3" width="40px" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Flash loan flow skeleton */}
      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <SkeletonCard>
            <div className="flex items-center gap-4 border-b-[3px] border-[#0a0a0a] p-6">
              <SkeletonBlock className="h-6" width="250px" />
            </div>
            <div className="grid gap-0 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border-r-0 border-[#0a0a0a] p-5 last:border-r-0 md:border-r-[3px]"
                >
                  <SkeletonBlock className="mb-2 h-10 w-10" />
                  <SkeletonBlock className="mb-1 h-4" width="80%" />
                  <SkeletonBlock className="h-3" width="90%" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </section>
    </main>
  );
}
