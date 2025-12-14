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

type PollOptionField = {
  id: string;
  text: string;
  imagePath: string | null;
  previewUrl: string | null;
  imageUrlInput: string;
  isUploading: boolean;
  uploadError: string | null;
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const EXTERNAL_URL_REGEX = /^https?:\/\//i;

function isExternalUrl(url: string | null) {
  return Boolean(url && EXTERNAL_URL_REGEX.test(url));
}

const createEmptyOption = (): PollOptionField => ({
  id: crypto.randomUUID(),
  text: "",
  imagePath: null,
  previewUrl: null,
  imageUrlInput: "",
  isUploading: false,
  uploadError: null,
});

export default function CreatePollClient() {
  const router = useRouter();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOptionField[]>([
    createEmptyOption(),
    createEmptyOption(),
  ]);
  const [isPublic, setIsPublic] = useState(true);
  const [expiresAt, setExpiresAt] = useState(getDefaultExpiresAt());
  const [activePreset, setActivePreset] = useState<string | null>("1d");
  const [maxVoters, setMaxVoters] = useState("");
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
    setOptions((prev) =>
      prev.map((option, i) =>
        i === index ? { ...option, text: value } : option
      )
    );
  };

  const addOption = () => {
    setOptions((prev) =>
      prev.length < 6 ? [...prev, createEmptyOption()] : prev
    );
  };

  const removeOption = (index: number) => {
    setOptions((prev) => {
      if (prev.length <= 2) return prev;
      const target = prev[index];
      if (target?.imagePath && !isExternalUrl(target.imagePath)) {
        void fetch(`/api/polls/images?path=${encodeURIComponent(target.imagePath)}`, {
          method: "DELETE",
        }).catch(() => null);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveImage = async (index: number) => {
    const target = options[index];
    if (!target?.imagePath) return;

    setOptions((prev) =>
      prev.map((option, i) =>
        i === index
          ? {
              ...option,
              imagePath: null,
              previewUrl: null,
              imageUrlInput: "",
              uploadError: null,
            }
          : option
      )
    );

    if (isExternalUrl(target.imagePath)) return;

    try {
      await fetch(`/api/polls/images?path=${encodeURIComponent(target.imagePath)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("이미지 삭제 실패:", err);
    }
  };

  const handleImageUpload = async (
    index: number,
    file: File | null | undefined
  ) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? {
                ...option,
                uploadError: "이미지는 최대 10MB까지 업로드할 수 있습니다.",
              }
            : option
        )
      );
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? {
                ...option,
                uploadError: "JPEG, PNG, WebP 형식만 업로드할 수 있습니다.",
              }
            : option
        )
      );
      return;
    }

    const previousPath = options[index]?.imagePath;

    setOptions((prev) =>
      prev.map((option, i) =>
        i === index
          ? { ...option, isUploading: true, uploadError: null }
          : option
      )
    );

    try {
      if (previousPath && !isExternalUrl(previousPath)) {
        await fetch(`/api/polls/images?path=${encodeURIComponent(previousPath)}`, {
          method: "DELETE",
        });
      }

      const response = await fetch("/api/polls/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.path || !result?.token) {
        throw new Error(
          result?.error || "이미지 업로드 URL을 생성하지 못했습니다."
        );
      }

      const uploadResult = await supabase.storage
        .from("poll_images")
        .uploadToSignedUrl(result.path, result.token, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
      }

      const previewUrl = URL.createObjectURL(file);

      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? {
                ...option,
                imagePath: result.path as string,
                previewUrl,
                imageUrlInput: "",
                isUploading: false,
                uploadError: null,
              }
            : option
        )
      );
    } catch (err) {
      console.error("이미지 업로드 실패:", err);
      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? {
                ...option,
                isUploading: false,
                uploadError:
                  err instanceof Error
                    ? err.message
                    : "이미지 업로드 중 오류가 발생했습니다.",
                imagePath: null,
                previewUrl: null,
              }
            : option
        )
      );
    }
  };

  const applyOptionImageUrl = async (index: number) => {
    const target = options[index];
    if (!target) return;

    const next = target.imageUrlInput.trim();

    if (!next) {
      await handleRemoveImage(index);
      return;
    }

    if (!isExternalUrl(next) || !(next.startsWith("http://") || next.startsWith("https://"))) {
      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? {
                ...option,
                uploadError: "외부 URL은 http/https 형식이어야 합니다.",
              }
            : option
        )
      );
      return;
    }

    if (next.includes("/storage/v1/object/sign/")) {
      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? {
                ...option,
                uploadError:
                  "Supabase 서명 URL은 저장할 수 없습니다. 업로드 후 경로(path)를 사용해주세요.",
              }
            : option
        )
      );
      return;
    }

    try {
      new URL(next);
    } catch {
      setOptions((prev) =>
        prev.map((option, i) =>
          i === index
            ? { ...option, uploadError: "외부 URL 형식이 올바르지 않습니다." }
            : option
        )
      );
      return;
    }

    const previousPath = target.imagePath;

    setOptions((prev) =>
      prev.map((option, i) =>
        i === index
          ? {
              ...option,
              imagePath: next,
              previewUrl: next,
              uploadError: null,
            }
          : option
      )
    );

    if (previousPath && !isExternalUrl(previousPath)) {
      void fetch(`/api/polls/images?path=${encodeURIComponent(previousPath)}`, {
        method: "DELETE",
      }).catch(() => null);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasUploading = options.some((option) => option.isUploading);

    if (hasUploading) {
      setError("이미지 업로드가 완료될 때까지 기다려주세요.");
      return;
    }

    const payload: CreatePollInput = {
      question,
      options: options.map((option) => option.text),
      optionImageUrls: options.map((option) => option.imagePath ?? null),
      isPublic,
      expiresAt: expiresAt || null,
      maxVoters:
        !isPublic && maxVoters.trim() !== "" ? Number(maxVoters) : null,
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

  const isUploadInProgress = options.some((option) => option.isUploading);

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
                  <div
                    key={option.id}
                    className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={option.text}
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
	                    <div className="flex flex-wrap items-center gap-3">
	                      <label
	                        htmlFor={`option-image-${option.id}`}
	                        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs md:text-sm font-medium text-text-primary hover:border-primary ${
	                          option.isUploading || isSubmitting
	                            ? "pointer-events-none opacity-60"
	                            : ""
	                        }`}
	                      >
	                        이미지 업로드
	                        {option.isUploading && (
	                          <span className="text-xs text-text-secondary">(업로드 중)</span>
	                        )}
	                      </label>
	                      <input
	                        id={`option-image-${option.id}`}
	                        type="file"
	                        accept="image/jpeg,image/png,image/webp"
	                        className="hidden"
	                        disabled={option.isUploading || isSubmitting}
	                        onChange={(e) => {
	                          const file = e.target.files?.[0];
	                          e.target.value = "";
	                          void handleImageUpload(index, file);
	                        }}
	                      />
	                      {option.previewUrl ? (
	                        <div className="flex items-center gap-2">
	                          <img
	                            src={option.previewUrl}
                            alt="선택지 이미지 미리보기"
                            className="h-14 w-14 rounded-md object-cover border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="text-xs text-destructive"
                          >
                            이미지 제거
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary">
	                          최대 10MB, JPEG/PNG/WebP 지원
	                        </p>
	                      )}
	                    </div>

	                    <div className="space-y-2">
	                      <label className="block text-xs font-semibold text-text-tertiary">
	                        외부 URL (선택)
	                      </label>
	                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
	                        <input
	                          type="text"
	                          value={option.imageUrlInput}
	                          onChange={(e) => {
	                            const value = e.target.value;
	                            setOptions((prev) =>
	                              prev.map((item, i) =>
	                                i === index
	                                  ? {
	                                      ...item,
	                                      imageUrlInput: value,
	                                      uploadError: null,
	                                    }
	                                  : item
	                              )
	                            );
	                          }}
	                          placeholder="https://... (비워두면 제거)"
	                          className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
	                          disabled={option.isUploading || isSubmitting}
	                        />
	                        <button
	                          type="button"
	                          onClick={() => void applyOptionImageUrl(index)}
	                          disabled={option.isUploading || isSubmitting}
	                          className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-text-primary hover:border-primary disabled:opacity-50"
	                        >
	                          적용
	                        </button>
	                      </div>
	                      <p className="text-xs text-text-secondary">
	                        외부 URL은 http/https만 지원하며, Supabase 서명 URL은 저장할 수 없습니다.
	                      </p>
	                    </div>
	                    {option.uploadError && (
	                      <p className="text-destructive text-xs">{option.uploadError}</p>
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
                    onChange={() => {
                      setIsPublic(true);
                      setMaxVoters("");
                    }}
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

            {!isPublic && (
              <div className="mb-4 md:mb-6">
                <label className="text-sm md:text-base font-medium text-text-primary mb-2 block">
                  참여 인원 제한 (선착순, 선택)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="미입력 시 제한 없음"
                  value={maxVoters}
                  onChange={(e) => setMaxVoters(e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm md:text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-text-secondary">
                  정원에 도달하면 자동으로 투표가 마감되고, 이후에는 결과만 확인할 수 있어요.
                </p>
              </div>
            )}

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
              disabled={isSubmitting || isUploadInProgress}
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
