import { SkeletonBlock, PageHeroSkeleton } from "@/components/Skeleton";
import Header from "@/components/Header";

export default function FAQLoading() {
  return (
    <div className="min-h-screen bg-grid-brutal text-[#0a0a0a]">
      <Header />
      <PageHeroSkeleton badgeWidth={130} subtitleWidth={400} />

      <main className="px-5 pb-20 md:px-10 lg:px-12">
        <section className="mx-auto max-w-6xl">
          <div className="mt-12 grid gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="border-[3px] border-[#0a0a0a] bg-grid-brutal shadow-[10px_10px_0_#0a0a0a]"
              >
                <div className="flex min-h-[72px] w-full items-center justify-between gap-4 px-5 py-4">
                  <span className="flex items-center gap-4">
                    <SkeletonBlock className="h-8 w-12 border-[3px] border-[#0a0a0a]" />
                    <SkeletonBlock className="h-5" width={`${200 + (index % 3) * 60}px`} />
                  </span>
                  <SkeletonBlock className="h-6 w-8" />
                </div>
              </div>
            ))}
          </div>

          {/* Contact CTA skeleton */}
          <div className="mt-12 border-[4px] border-[#0a0a0a] bg-[#0a0a0a] p-6 shadow-[14px_14px_0_#38bdf8] md:p-8">
            <SkeletonBlock className="mb-4 h-3" width="160px" />
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <SkeletonBlock className="mb-3 h-10" width="60%" />
                <SkeletonBlock className="h-5" width="80%" />
              </div>
              <div className="flex flex-wrap gap-3">
                <SkeletonBlock className="h-12 w-28" />
                <SkeletonBlock className="h-12 w-24" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
