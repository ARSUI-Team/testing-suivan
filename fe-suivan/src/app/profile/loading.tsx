import { SkeletonBlock, SkeletonCard, PageHeroSkeleton, StatCardGridSkeleton } from "@/components/Skeleton";
import Header from "@/components/Header";

export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />
      <PageHeroSkeleton badgeWidth={100} subtitleWidth={350} />

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <StatCardGridSkeleton count={4} />

          {/* Info panels side by side */}
          <div className="mb-8 mt-8 grid gap-8 lg:grid-cols-2">
            {/* User info panel */}
            <SkeletonCard>
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <SkeletonBlock className="h-3" width="40px" />
                  <SkeletonBlock className="h-3" width="30px" />
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <SkeletonBlock className="h-4" width="16px" />
                  <SkeletonBlock className="h-3" width="100px" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 pt-4 border-t-[2px] border-[#0a0a0a]">
                      <SkeletonBlock className="h-3" width="80px" />
                      <SkeletonBlock className="h-7" width="140px" />
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonCard>

            {/* Activity panel */}
            <SkeletonCard>
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <SkeletonBlock className="h-3" width="40px" />
                  <SkeletonBlock className="h-3" width="50px" />
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <SkeletonBlock className="h-4" width="16px" />
                  <SkeletonBlock className="h-3" width="60px" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-[3px] border-[#0a0a0a] bg-[#fbf7ed] p-3">
                      <SkeletonBlock className="h-9 w-9 shrink-0" />
                      <div className="flex-1">
                        <SkeletonBlock className="mb-1 h-3" width="70%" />
                        <SkeletonBlock className="h-3" width="40%" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonCard>
          </div>

          {/* Badges section */}
          <div className="mb-4 flex items-center gap-2">
            <SkeletonBlock className="h-4" width="16px" />
            <SkeletonBlock className="h-4" width="60px" />
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-12" width="100px" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
