"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { GradientSpinner } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const getSafeRedirectPath = (target: string | null) => {
    if (typeof window === "undefined" || !target) {
      return "/";
    }

    try {
      const url = new URL(target, window.location.origin);

      if (url.origin !== window.location.origin) {
        return "/";
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return target.startsWith("/") ? target : "/";
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        "로그인 정보가 올바르지 않습니다. 이메일과 비밀번호를 확인해주세요."
      );
    } else {
      // 리디렉션 URL을 가져오거나 기본값으로 '/'를 사용합니다.
      const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
      // router.push() 대신 window.location.assign()을 사용하여 전체 페이지를 새로고침합니다.
      // 이렇게 하면 서버가 새로운 세션 쿠키를 확실하게 읽어들일 수 있습니다.
      window.location.assign(redirectPath);
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:py-12">
      <header className="space-y-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
          <span className="rounded-full bg-success/10 px-3 py-1 text-success">
            보안 로그인
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            투표/즐겨찾기 동기화
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          로그인하고 바로 투표를 이어가세요
        </h1>
        <p className="text-base text-text-secondary md:text-lg">
          참여 내역, 즐겨찾기, 프로필을 기기마다 자동으로 동기화합니다.
        </p>
      </header>

      <main className="mt-8 grid gap-6 md:grid-cols-[1.05fr,0.95fr]">
        <form
          onSubmit={handleSignIn}
          className="rounded-3xl border border-border bg-panel/70 p-6 shadow-inner md:p-8"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-secondary" htmlFor="email">
                이메일
              </label>
              <input
                className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-secondary" htmlFor="password">
                비밀번호
              </label>
              <input
                className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8c00] to-[#ff6b00] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#ff6b00] hover:to-[#ff5500] disabled:opacity-60"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </button>
              <p className="text-center text-sm text-text-secondary">
                계정이 없으신가요?{" "}
                <a
                  href="/signup"
                  className="font-semibold text-primary underline-offset-4 hover:text-primary/80 hover:underline"
                >
                  회원가입
                </a>
              </p>
              <div className="rounded-xl border border-border-subtle bg-background/70 px-4 py-3 text-xs text-text-tertiary">
                로그인 시 새로운 기기에서도 투표/즐겨찾기/포인트가 자동으로 동기화됩니다.
              </div>
            </div>
          </div>
        </form>

        <div className="rounded-3xl border border-border bg-panel/60 p-6 shadow-inner md:p-7">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
            <span className="rounded-full bg-info/10 px-2.5 py-1 text-info">안내</span>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">혜택</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-text-primary md:text-2xl">
            로그인하면 이런 점이 달라집니다
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary md:text-base">
            <li>• 투표/즐겨찾기/포인트를 모든 기기에서 동일하게 유지</li>
            <li>• 비공개 투표 접근, 즐겨찾기 토글, 돌림판 결과까지 그대로</li>
            <li>• 프로필/아바타를 변경하면 Navbar와 상세 페이지에 즉시 반영</li>
            <li>• 로그인 리디렉션: 이전에 보던 페이지로 자동 복귀</li>
          </ul>
          <div className="mt-6 rounded-xl border border-border-subtle bg-background/70 px-4 py-3 text-xs text-text-tertiary">
            안전한 환경을 위해 동일 오리진 경로만 리디렉션합니다. 이메일/비밀번호는 Supabase Auth에서 직접 처리됩니다.
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <GradientSpinner />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
