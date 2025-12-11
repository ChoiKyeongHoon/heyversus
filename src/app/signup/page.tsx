"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!username || !email || !password) {
      setError("닉네임, 이메일, 비밀번호를 모두 입력해주세요.");
      setIsLoading(false);
      return;
    }

    // 1. 닉네임 중복 확인
    const { data: usernameExists, error: checkError } = await supabase.rpc(
      'check_username_exists',
      { username_to_check: username }
    );

    if (checkError) {
      setError(`닉네임 확인 중 오류가 발생했습니다: ${checkError.message}`);
      setIsLoading(false);
      return;
    }

    if (usernameExists) {
      setError("이미 사용 중인 닉네임입니다.");
      setIsLoading(false);
      return;
    }

    // 2. 이메일 중복 확인
    const { data: emailExists, error: emailCheckError } = await supabase.rpc(
      'check_email_exists',
      { email_to_check: email }
    );

    if (emailCheckError) {
      setError(`이메일 확인 중 오류가 발생했습니다: ${emailCheckError.message}`);
      setIsLoading(false);
      return;
    }

    if (emailExists) {
      setError("이미 사용 중인 이메일입니다.");
      setIsLoading(false);
      return;
    }

    // 3. 중복이 없으면 회원가입 진행
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          username: username, // 닉네임을 메타데이터로 전달
        },
      },
    });

    if (error) {
      setError(`회원가입 중 오류가 발생했습니다: ${error.message}`);
    } else if (data.user) {
      setSuccess("회원가입 성공! 확인 이메일이 발송되었습니다. 잠시 후 로그인 페이지로 이동합니다.");
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:py-12">
      <header className="space-y-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">새 계정</span>
          <span className="rounded-full bg-success/10 px-3 py-1 text-success">프로필/즐겨찾기 동기화</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          회원가입하고 나만의 투표 경험을 시작하세요
        </h1>
        <p className="text-base text-text-secondary md:text-lg">
          닉네임을 포함한 계정을 만들고 투표·즐겨찾기·포인트를 한 곳에서 관리하세요.
        </p>
      </header>

      <main className="mt-8 grid gap-6 md:grid-cols-[1.05fr,0.95fr]">
        <form
          onSubmit={handleSignUp}
          className="rounded-3xl border border-border bg-panel/70 p-6 shadow-inner md:p-8"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-secondary" htmlFor="username">
                닉네임
              </label>
              <input
                className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                id="username"
                type="text"
                placeholder="사용할 닉네임을 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
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
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive text-center">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success text-center">
                {success}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-br from-[#ff8c00] to-[#ff6b00] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#ff6b00] hover:to-[#ff5500] disabled:opacity-60"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </button>
              <p className="text-center text-sm text-text-secondary">
                이미 계정이 있으신가요?{" "}
                <a
                  href="/signin"
                  className="font-semibold text-primary underline-offset-4 hover:text-primary/80 hover:underline"
                >
                  로그인
                </a>
              </p>
              <div className="rounded-xl border border-border-subtle bg-background/70 px-4 py-3 text-xs text-text-tertiary">
                가입 후 확인 이메일을 보내드려요. 인증을 마치면 투표/즐겨찾기/포인트가 계정에 저장됩니다.
              </div>
            </div>
          </div>
        </form>

        <div className="rounded-3xl border border-border bg-panel/60 p-6 shadow-inner md:p-7">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
            <span className="rounded-full bg-info/10 px-2.5 py-1 text-info">안내</span>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">필수 확인</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-text-primary md:text-2xl">
            가입 전 알아두세요
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary md:text-base">
            <li>• 닉네임/이메일 중복을 자동으로 검사합니다.</li>
            <li>• Supabase Auth를 사용해 비밀번호를 안전하게 처리합니다.</li>
            <li>• 가입 후 확인 이메일을 열어 인증을 완료해야 로그인할 수 있습니다.</li>
            <li>• 로그인하면 비공개 투표 접근, 즐겨찾기 토글, 프로필 편집이 활성화됩니다.</li>
          </ul>
          <div className="mt-6 rounded-xl border border-border-subtle bg-background/70 px-4 py-3 text-xs text-text-tertiary">
            이메일 인증 링크는 현재 기기의 동일 오리진 경로만 허용합니다. 링크가 도착하지 않으면 스팸함을 확인해주세요.
          </div>
        </div>
      </main>
    </div>
  );
}
