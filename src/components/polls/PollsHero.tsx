"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type HeroAction = {
  label: string;
  href: string;
  variant?: "default" | "outline";
};

interface PollsHeroProps {
  stats: Array<{ label: string; value: string; helper?: string }>;
  eyebrowText?: string;
  titlePrefix?: string;
  titleHighlight?: string;
  titleSuffix?: string;
  description?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
}

export function PollsHero({
  stats,
  eyebrowText = "Explore & Vote",
  titlePrefix = "다양한 투표를 발견하고",
  titleHighlight = "당신의 선택",
  titleSuffix = "을 보여주세요.",
  description = "실시간으로 갱신되는 인기 투표와 마감 임박한 주제를 한눈에 확인하고, 단 한 번의 클릭으로 참여해 보세요.",
  primaryAction = { label: "새 투표 만들기", href: "/create-poll" },
  secondaryAction = { label: "즐겨찾기 보기", href: "/favorites", variant: "outline" },
}: PollsHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-10">
      <div className="space-y-4 md:space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">
            {eyebrowText}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl">
            {titlePrefix} <span className="text-primary">{titleHighlight}</span>
            {titleSuffix}
          </h1>
          <p className="mt-3 text-sm text-text-secondary md:text-base">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-background/70 px-4 py-3"
            >
              <p className="text-xs text-text-tertiary">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              {stat.helper ? (
                <p className="text-xs text-text-secondary">{stat.helper}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="font-semibold"
            variant={primaryAction.variant ?? "default"}
          >
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
          <Button
            asChild
            variant={secondaryAction.variant ?? "outline"}
            size="lg"
            className="font-semibold"
          >
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
