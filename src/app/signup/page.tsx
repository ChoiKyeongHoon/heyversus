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
    <div className="container mx-auto max-w-4xl p-8">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tighter mb-2">회원가입</h1>
        <p className="text-text-secondary text-lg">
          새로운 계정을 만들어보세요.
        </p>
      </header>

      {/* Main Content */}
      <main>
        <div className="w-full max-w-md mx-auto">
          <form
            onSubmit={handleSignUp}
            className="bg-panel border border-border rounded-lg p-6"
          >
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-text-secondary mb-2"
                htmlFor="username"
              >
                닉네임
              </label>
              <input
                className="w-full bg-background-light border border-border rounded-md px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                id="username"
                type="text"
                placeholder="사용할 닉네임을 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
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
              <p className="text-danger text-xs italic mb-4 text-center">{error}</p>
            )}
            {success && (
              <p className="text-success text-xs italic mb-4 text-center">{success}</p>
            )}
            <div className="flex items-center justify-center">
              <button
                className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 transition-colors duration-200"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </button>
            </div>

            <div className="mt-4 text-center text-sm text-text-secondary">
              이미 계정이 있으신가요?{" "}
              <a
                href="/signin"
                className="font-semibold text-primary hover:text-primary/80 underline-offset-4 hover:underline"
              >
                로그인
              </a>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
}
