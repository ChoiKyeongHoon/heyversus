import Image from "next/image";

import { LOW_RES_PLACEHOLDER } from "@/constants/images";

const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

interface LandingHeroProps {
  highlightQuestion?: string;
  heroImageUrl?: string | null;
  heroImageAlt?: string;
}

export function LandingHero({
  highlightQuestion = "오늘의 대표 투표에서 함께 선택해보세요.",
  heroImageUrl,
  heroImageAlt = "대표 투표 이미지",
}: LandingHeroProps) {
  const canUseNextImage = Boolean(
    heroImageUrl && supabaseHostname && heroImageUrl.includes(supabaseHostname)
  );

  return (
    <section className="relative grid gap-10 rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-background px-6 py-8 md:px-10 lg:grid-cols-[1.05fr,0.95fr]">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-text-tertiary">
            Daily Featured Poll
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            <span className="block">당신의 선택으로</span>
            <span className="block text-primary">트렌드를 만들어요.</span>
          </h1>
          <p className="mt-4 text-base text-text-secondary md:text-lg">
            {highlightQuestion}
          </p>
        </div>

      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-3xl" />
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[32px] border border-border/80 bg-gradient-to-br from-slate-800/60 to-slate-600/30 shadow-2xl">
          {heroImageUrl ? (
            <div className="relative h-full w-full">
              {canUseNextImage ? (
                <Image
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  fill
                  priority
                  fetchPriority="high"
                  quality={70}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 640px"
                  placeholder="blur"
                  blurDataURL={LOW_RES_PLACEHOLDER}
                  className="object-cover"
                />
              ) : (
                <img
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              )}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-600/50 to-slate-800/60 text-text-secondary">
              <span className="text-sm font-semibold">대표 이미지 준비 중</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
