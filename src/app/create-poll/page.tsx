"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

import { useSupabase } from "@/hooks/useSupabase";

export default function CreatePollPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]); // 2개의 선택지로 시작
  const [isPublic, setIsPublic] = useState(true); // 공개/비공개 상태

  // 24시간 후를 기본 만료 시간으로 설정하는 함수
  const getDefaultExpiresAt = () => {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    // YYYY-MM-DDTHH:mm 형식으로 변환
    return now.toISOString().slice(0, 16);
  };

  const [expiresAt, setExpiresAt] = useState(getDefaultExpiresAt());
  const [activePreset, setActivePreset] = useState<string | null>("1d"); // '1d' for 24 hours default
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getMaxExpiresAt = () => {
    const now = new Date();
    now.setDate(now.getDate() + 30);
    return now.toISOString().slice(0, 16);
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/signin");
      } else {
        setUser(session.user);
        setIsLoading(false);
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  const formatToDateTimeLocal = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  const handlePresetClick = (
    preset: "1h" | "6h" | "12h" | "1d" | "3d" | "7d"
  ) => {
    const now = new Date();
    switch (preset) {
      case "1h":
        now.setHours(now.getHours() + 1);
        break;
      case "6h":
        now.setHours(now.getHours() + 6);
        break;
      case "12h":
        now.setHours(now.getHours() + 12);
        break;
      case "1d":
        now.setDate(now.getDate() + 1);
        break;
      case "3d":
        now.setDate(now.getDate() + 3);
        break;
      case "7d":
        now.setDate(now.getDate() + 7);
        break;
    }
    setExpiresAt(formatToDateTimeLocal(now));
    setActivePreset(preset);
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiresAt(e.target.value);
    setActivePreset(null); // 직접 변경 시 프리셋 선택 해제
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim()) {
      setError("질문을 입력해주세요.");
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setError("모든 선택지 내용을 채워주세요.");
      return;
    }
    if (!expiresAt) {
      setError("만료 시간을 설정해주세요.");
      return;
    }

    setIsLoading(true);

    const { data: newPollId, error: rpcError } = await supabase.rpc(
      "create_new_poll",
      {
        question_text: question,
        option_texts: options,
        is_public: isPublic,
        expires_at_param: new Date(expiresAt).toISOString(),
      }
    );

    if (rpcError) {
      console.error("Error creating poll:", rpcError);
      setError(`투표 생성 중 오류가 발생했습니다: ${rpcError.message}`);
      setIsLoading(false);
    } else {
      console.log("Successfully created poll with ID:", newPollId);
      router.push(`/poll/${newPollId}`);
    }
  };

  if (isLoading && !user) {
    return (
      <main className="container mx-auto p-4 pt-16 flex justify-center">
        <p className="text-white">사용자 정보를 확인하는 중...</p>
      </main>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Header */}
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mb-2 px-4">
          새로운 투표 만들기
        </h1>
        <p className="text-sm md:text-base lg:text-lg text-text-secondary px-4">
          당신만의 투표를 만들어보세요.
        </p>
      </header>

      {/* Main Content */}
      <main>
        <div className="w-full max-w-2xl mx-auto">
          <form
            onSubmit={handleCreatePoll}
            className="bg-panel border border-border rounded-lg p-4 md:p-6"
          >
            <div className="mb-4 md:mb-6">
              <label
                className="block text-xs md:text-sm font-medium text-text-secondary mb-2"
                htmlFor="poll-question"
              >
                투표 질문
              </label>
              <input
                id="poll-question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="투표하실 질문을 입력해 주세요"
                className="w-full bg-background-light border border-border rounded-md px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="mb-4 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">
                투표 종류
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 py-2 px-4 focus:outline-none transition-colors duration-200 ${
                    isPublic
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  공개 투표
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 py-2 px-4 focus:outline-none transition-colors duration-200 ${
                    !isPublic
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  비공개 투표
                </button>
              </div>
              <p className="text-xs md:text-sm text-text-tertiary mt-2">
                {isPublic
                  ? "누구나 투표하고 결과를 볼 수 있습니다."
                  : "로그인한 사용자만 투표할 수 있습니다. (기능 준비중)"}
              </p>
            </div>

            <div className="mb-4 md:mb-6">
              <label
                className="block text-xs md:text-sm font-medium text-text-secondary mb-2"
                htmlFor="expires-at"
              >
                투표 만료 시간
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handlePresetClick("1h")}
                  className={`py-2 px-2 text-xs rounded-md transition-colors duration-200 min-h-[44px] ${
                    activePreset === "1h"
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  1시간
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick("6h")}
                  className={`py-2 px-2 text-xs rounded-md transition-colors duration-200 min-h-[44px] ${
                    activePreset === "6h"
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  6시간
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick("12h")}
                  className={`py-2 px-2 text-xs rounded-md transition-colors duration-200 min-h-[44px] ${
                    activePreset === "12h"
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  12시간
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick("1d")}
                  className={`py-2 px-2 text-xs rounded-md transition-colors duration-200 min-h-[44px] ${
                    activePreset === "1d"
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  1일
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick("3d")}
                  className={`py-2 px-2 text-xs rounded-md transition-colors duration-200 min-h-[44px] ${
                    activePreset === "3d"
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  3일
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick("7d")}
                  className={`py-2 px-2 text-xs rounded-md transition-colors duration-200 min-h-[44px] ${
                    activePreset === "7d"
                      ? "bg-primary text-white"
                      : "bg-background-light text-text-secondary hover:bg-panel-hover"
                  }`}
                >
                  7일
                </button>
              </div>
              <input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={handleDateTimeChange}
                max={getMaxExpiresAt()}
                className="w-full bg-background-light border border-border rounded-md px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-text-primary placeholder-text-tertiary focus-outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {options.map((option, index) => (
              <div key={index} className="mb-4 md:mb-6">
                <label
                  className="block text-xs md:text-sm font-medium text-text-secondary mb-2"
                  htmlFor={`option${index}`}
                >
                  항목 {index + 1}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`option${index}`}
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`${index + 1} 번째 투표 대상을 입력해주세요.`}
                    className="w-full bg-background-light border border-border rounded-md px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-danger hover:text-danger/80 font-bold p-2 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-danger text-xs md:text-sm italic mt-4">{error}</p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6">
              <div>
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="bg-surface text-text-secondary rounded-full hover:bg-panel-hover flex items-center justify-center w-12 h-12 transition-colors duration-200 text-xl font-bold"
                  >
                    +
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 md:py-3 px-6 md:px-8 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 transition-colors duration-200 text-sm md:text-base min-h-[44px]"
                disabled={isLoading}
              >
                {isLoading ? "생성 중..." : "투표 생성"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
