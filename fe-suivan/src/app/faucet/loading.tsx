import { SkeletonBlock, SkeletonCard, PageHeroSkeleton } from "@/components/Skeleton";
import Header from "@/components/Header";

export default function FaucetLoading() {
  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />
      <PageHeroSkeleton badgeWidth={100} subtitleWidth={380} />

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Balance + Gas cards */}
          <div className="mb-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SkeletonBlock className="h-2" width="32px" />
                    <SkeletonBlock className="h-3" width="50px" />
                  </div>
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-12 w-12 shrink-0" />
                    <div>
                      <SkeletonBlock className="mb-1 h-3" width="60px" />
                      <SkeletonBlock className="h-8" width="100px" />
                    </div>
                  </div>
                </div>
              </SkeletonCard>
              <SkeletonCard>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SkeletonBlock className="h-2" width="32px" />
                    <SkeletonBlock className="h-3" width="30px" />
                  </div>
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-12 w-12 shrink-0" />
                    <div>
                      <SkeletonBlock className="mb-1 h-3" width="100px" />
                      <SkeletonBlock className="h-5" width="80px" />
                    </div>
                  </div>
                </div>
              </SkeletonCard>
            </div>
          </div>

          {/* Claim button skeleton */}
          <div className="mb-8">
            <SkeletonBlock className="mx-auto h-16 w-64 border-[3px] border-[#0a0a0a]" />
            <SkeletonBlock className="mx-auto mt-3 h-4" width="180px" />
          </div>

          {/* Info cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i}>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SkeletonBlock className="h-2" width="32px" />
                    <SkeletonBlock className="h-3" width="30px" />
                  </div>
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-10 w-10 shrink-0" />
                    <div>
                      <SkeletonBlock className="mb-1 h-3" width="80px" />
                      <SkeletonBlock className="h-4" width="120px" />
                    </div>
                  </div>
                </div>
              </SkeletonCard>
            ))}
          </div>

          {/* Claim history skeleton */}
          <SkeletonCard>
            <div className="p-6">
              <SkeletonBlock className="mb-5 h-4" width="140px" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between border-b-[2px] border-[#0a0a0a] pb-3">
                    <div>
                      <SkeletonBlock className="mb-1 h-4" width="120px" />
                      <SkeletonBlock className="h-3" width="80px" />
                    </div>
                    <SkeletonBlock className="h-6" width="50px" />
                  </div>
                ))}
              </div>
            </div>
          </SkeletonCard>
        </div>
      </section>
    </main>
  );
}
