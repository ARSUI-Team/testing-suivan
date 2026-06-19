import { SkeletonBlock, SkeletonCard } from "@/components/Skeleton";
import Header from "@/components/Header";

export default function PoolDetailLoading() {
  return (
    <main className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />

      <section className="relative isolate overflow-hidden px-5 pb-6 pt-32 md:px-10 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.28),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(168,164,154,0.18),transparent_26%)]" />
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2">
            <SkeletonBlock className="h-4" width="60px" />
            <SkeletonBlock className="h-3" width="12px" />
            <SkeletonBlock className="h-4" width="100px" />
          </div>

          {/* Pool name + status */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <SkeletonBlock className="h-14 md:h-16" width="300px" />
            <SkeletonBlock className="h-8" width="90px" />
          </div>

          {/* Description */}
          <SkeletonBlock className="mb-8 h-5" width="480px" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-5 pb-12 md:px-10 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i}>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SkeletonBlock className="h-2" width="24px" />
                    <SkeletonBlock className="h-2" width="16px" />
                  </div>
                  <SkeletonBlock className="mb-1 h-3" width="60px" />
                  <SkeletonBlock className="h-8" width="100px" />
                </div>
              </SkeletonCard>
            ))}
          </div>

          {/* Pool detail + participant list */}
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SkeletonCard>
                <div className="border-b-[3px] border-[#0a0a0a] p-6">
                  <SkeletonBlock className="mb-2 h-5" width="150px" />
                  <SkeletonBlock className="h-4" width="300px" />
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <SkeletonBlock className="h-4" width="100px" />
                        <SkeletonBlock className="h-4" width="140px" />
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <SkeletonBlock className="h-12 w-36" />
                    <SkeletonBlock className="h-12 w-36" />
                    <SkeletonBlock className="h-12 w-36" />
                  </div>
                </div>
              </SkeletonCard>
            </div>

            {/* Participants sidebar */}
            <div className="lg:col-span-1">
              <SkeletonCard>
                <div className="border-b-[3px] border-[#0a0a0a] p-4">
                  <SkeletonBlock className="h-5" width="120px" />
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
                        <div className="flex-1">
                          <SkeletonBlock className="mb-1 h-3" width="140px" />
                          <SkeletonBlock className="h-3" width="80px" />
                        </div>
                      </div>
                    ))}
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
