"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSupabase } from "@/hooks/useSupabase";
import { type CreatePollInput, createPollSchema } from "@/lib/validation/poll";

const getDefaultExpiresAt = () => {
  const now = new Date();
  now.setHours(now.getHours() + 24);
  return now.toISOString().slice(0, 16);
};

const getMaxExpiresAt = () => {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now.toISOString().slice(0, 16);
};

const formatToDateTimeLocal = (date: Date) => date.toISOString().slice(0, 16);

const EXPIRATION_PRESETS = [
  { label: "1시간", value: "1h" },
  { label: "6시간", value: "6h" },
  { label: "12시간", value: "12h" },
  { label: "1일", value: "1d" },
  { label: "3일", value: "3d" },
  { label: "7일", value: "7d" },
] as const;

type ExpirationPresetValue = typeof EXPIRATION_PRESETS[number]["value"];

export default function CreatePollClient() {
  const router = useRouter();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isPublic, setIsPublic] = useState(true);
  const [expiresAt, setExpiresAt] = useState(getDefaultExpiresAt());
  const [activePreset, setActivePreset] = useState<string | null>("1d");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push("/signin?redirect=/create-poll");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const handlePresetClick = (preset: ExpirationPresetValue) => {
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
    setActivePreset(null);
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addOption = () => {
    setOptions((prev) => (prev.length < 6 ? [...prev, ""] : prev));
  };

  const removeOption = (index: number) => {
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: CreatePollInput = {
      question,
      options,
      isPublic,
      expiresAt: expiresAt || null,
    };

    const parsed = createPollSchema.safeParse(payload);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.message ?? "입력값을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          setError("세션이 만료되었습니다. 다시 로그인해 주세요.");
          router.push("/signin?redirect=/create-poll");
          return;
        }

        setError(
          result?.error || "투표 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const profileKey = ["current-profile", session.user.id];
        const profile =
          queryClient.getQueryData<{ points?: number }>(profileKey) ||
          queryClient.getQueryData<{ points?: number }>(["current-profile"]);
        if (profile) {
          const currentPoints = Number(profile.points ?? 0);
          // create_poll 가중치(쿼리 기준 3점)를 낙관적으로 반영
          queryClient.setQueryData(profileKey, {
            ...profile,
            points: currentPoints + 3,
          });
          queryClient.setQueryData(["current-profile"], {
            ...profile,
            points: currentPoints + 3,
          });
        }

        queryClient.invalidateQueries({
          queryKey: ["current-profile", session.user.id],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["current-profile"],
          exact: false,
        });
        queryClient.invalidateQueries({ queryKey: ["leaderboard"], exact: false });
      }

      if (result?.pollId) {
        router.push(`/poll/${result.pollId}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Error creating poll:", err);
      setError("투표 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mb-2 px-4">
          새로운 투표 만들기
        </h1>
        <p className="text-sm md:text-base lg:text-lg text-text-secondary px-4">
          당신만의 투표를 만들어보세요.
        </p>
      </header>

      <main>
        <div className="w-full max-w-2xl mx-auto">
          <form
            onSubmit={handleCreatePoll}
            className="bg-panel border border-border rounded-lg p-4 md:p-6"
          >
            <div className="mb-4 md:mb-6">
              <label
                htmlFor="question"
                className="block text-sm md:text-base font-medium text-text-primary mb-2"
              >
                질문
              </label>
              <input
                id="question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm md:text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="어떤 주제에 대해 투표하고 싶으신가요?"
                required
              />
            </div>

            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm md:text-base font-medium text-text-primary">
                  선택지
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={options.length >= 6}
                  className="text-primary text-sm md:text-base font-medium disabled:opacity-50"
                >
                  + 선택지 추가
                </button>
              </div>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm md:text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={`선택지 ${index + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-destructive text-sm md:text-base"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              <label className="text-sm md:text-base font-medium text-text-primary mb-2 block">
                공개 여부
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm md:text-base">
                  <input
                    type="radio"
                    name="visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  공개
                </label>
                <label className="flex items-center gap-2 text-sm md:text-base">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  비공개
                </label>
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              <label className="text-sm md:text-base font-medium text-text-primary mb-2 block">
                만료 시간
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {EXPIRATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetClick(preset.value)}
                    className={`text-xs sm:text-sm py-2 rounded-md border ${
                      activePreset === preset.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="datetime-local"
                value={expiresAt}
                min={getDefaultExpiresAt()}
                max={getMaxExpiresAt()}
                onChange={handleDateTimeChange}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm md:text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm md:text-base mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 md:py-3 rounded-md transition-colors duration-200 text-sm md:text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "생성 중..." : "투표 생성"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
