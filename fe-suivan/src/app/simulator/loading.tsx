import { SkeletonBlock, SkeletonCard, PageHeroSkeleton } from "@/components/Skeleton";
import Header from "@/components/Header";

export default function SimulatorLoading() {
  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />
      <PageHeroSkeleton badgeWidth={140} subtitleWidth={400} />

      <section className="px-5 pb-20 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Input Panel Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <SkeletonCard>
                <div className="p-6">
                  <div className="mb-6 flex items-center justify-between border-b-[2px] border-[#0a0a0a] pb-4">
                    <div>
                      <SkeletonBlock className="mb-2 h-5" width="60px" />
                      <SkeletonBlock className="h-6" width="100px" />
                    </div>
                    <SkeletonBlock className="h-3" width="30px" />
                  </div>

                  {/* 3 Slider Skeletons */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${i < 2 ? "mb-6" : "mb-4"}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <SkeletonBlock className="h-3" width="120px" />
                        <SkeletonBlock className="h-7" width="60px" />
                      </div>
                      <SkeletonBlock className="h-2 w-full" />
                      <div className="mt-1 flex justify-between">
                        <SkeletonBlock className="h-3" width="50px" />
                        <SkeletonBlock className="h-3" width="60px" />
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 border-t-[2px] border-[#0a0a0a] pt-3">
                    <SkeletonBlock className="h-3" width="80px" />
                  </div>
                </div>
              </SkeletonCard>
            </div>

            {/* Results Panel Skeleton */}
            <div className="lg:col-span-3 space-y-6">
              <SkeletonCard>
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <SkeletonBlock className="h-4" width="48px" />
                    <SkeletonBlock className="h-3" width="40px" />
                  </div>
                  <SkeletonBlock className="mb-1 h-4" width="160px" />
                  <SkeletonBlock className="mb-4 h-3" width="200px" />
                  <SkeletonBlock className="mt-2 h-16 md:h-20" width="150px" />

                  <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="border-[3px] border-[#0a0a0a] bg-white p-4 shadow-[3px_3px_0_#0a0a0a]">
                        <SkeletonBlock className="mb-1 h-3" width="60px" />
                        <SkeletonBlock className="h-7" width="80px" />
                      </div>
                    ))}
                  </div>
                </div>
              </SkeletonCard>

              {/* Cost comparison skeleton */}
              <SkeletonCard>
                <div className="p-6">
                  <SkeletonBlock className="mb-3 h-4" width="120px" />
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="mt-2">
                        <SkeletonBlock className="mb-1 h-3" width="40px" />
                        <SkeletonBlock className="h-5" width="70px" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t-[2px] border-[#0a0a0a] pt-3">
                    <SkeletonBlock className="h-4" width="70%" />
                  </div>
                </div>
              </SkeletonCard>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
