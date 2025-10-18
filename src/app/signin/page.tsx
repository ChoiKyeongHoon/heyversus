"use client";

import { useSearchParams } from 'next/navigation';
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {

  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

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
      const redirectPath = searchParams.get('redirect') || '/';
      // router.push() 대신 window.location.assign()을 사용하여 전체 페이지를 새로고침합니다.
      // 이렇게 하면 서버가 새로운 세션 쿠키를 확실하게 읽어들일 수 있습니다.
      window.location.assign(redirectPath);
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tighter mb-2">로그인</h1>
        <p className="text-text-secondary text-lg">계정에 로그인하세요.</p>
      </header>

      {/* Main Content */}
      <main>
        <div className="w-full max-w-md mx-auto">
          <form
            onSubmit={handleSignIn}
            className="bg-panel border border-border rounded-lg p-6"
          >
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-text-secondary mb-2"
                htmlFor="email"
              >
                이메일
              </label>
              <input
                className="w-full bg-background-light border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label
                className="block text-sm font-medium text-text-secondary mb-2"
                htmlFor="password"
              >
                비밀번호
              </label>
              <input
                className="w-full bg-background-light border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-danger text-xs italic mb-4">{error}</p>
            )}
            <div className="flex items-center justify-center">
              <button
                className="bg-success hover:bg-success/90 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-success disabled:bg-gray-400 transition-colors duration-200"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
