"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/hooks/useSupabase";
import { getToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type AdminStats = {
  polls_created?: number;
  authenticated_votes_cast?: number;
  favorites_added?: number;
  active_users?: number;
  open_reports?: number;
  featured_polls?: number;
  range?: string;
};

type AdminReport = {
  id: string;
  target_type: "poll" | "user";
  poll_id: string | null;
  poll_question: string | null;
  poll_is_public: boolean | null;
  poll_is_featured: boolean | null;
  target_user_id: string | null;
  target_username: string | null;
  reason_code: string;
  reason_detail: string | null;
  status: "open" | "resolved" | "dismissed" | string;
  reporter_user_id: string;
  reporter_username: string | null;
  created_at: string;
  resolved_by: string | null;
  resolved_by_username: string | null;
  resolved_at: string | null;
  admin_note: string | null;
};

type AdminPollOption = {
  id: string;
  text: string | null;
  position: number;
  imageUrl: string | null;
  imagePreviewUrl: string | null;
  hasImage: boolean;
};

type AdminPoll = {
  id: string;
  question: string | null;
  createdAt: string;
  createdBy: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  status: string | null;
  expiresAt: string | null;
  options: AdminPollOption[];
  optionCount: number;
  optionsWithImagesCount: number;
  allOptionsHaveImages: boolean;
};

type AdminPollPagination = {
  total: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  nextOffset: number | null;
};

type AdminDashboardClientProps = {
  initialRange: "24h" | "7d" | "30d" | "all";
  initialStatus: "open" | "resolved" | "dismissed" | "all";
  initialStats: unknown;
  initialReports: unknown;
};

const RANGE_OPTIONS: Array<AdminDashboardClientProps["initialRange"]> = [
  "24h",
  "7d",
  "30d",
  "all",
];

const STATUS_OPTIONS: Array<AdminDashboardClientProps["initialStatus"]> = [
  "open",
  "resolved",
  "dismissed",
  "all",
];

const STATUS_LABELS: Record<AdminDashboardClientProps["initialStatus"], string> = {
  open: "미처리",
  resolved: "해결",
  dismissed: "기각",
  all: "전체",
};

const STATUS_ACTION_LABELS: Record<
  Exclude<AdminDashboardClientProps["initialStatus"], "all">,
  string
> = {
  open: "재오픈",
  resolved: "해결",
  dismissed: "기각",
};

function getReportStatusLabel(status: string) {
  return (
    STATUS_LABELS[status as AdminDashboardClientProps["initialStatus"]] ?? status
  );
}

const POLL_VISIBILITY_FILTERS = [
  { value: "all", label: "전체" },
  { value: "public", label: "공개" },
  { value: "private", label: "비공개" },
] as const;

const POLL_FEATURED_FILTERS = [
  { value: "all", label: "전체" },
  { value: "featured", label: "대표" },
  { value: "unfeatured", label: "비대표" },
] as const;

const EXTERNAL_URL_REGEX = /^https?:\/\//i;

function isExternalUrl(url: string | null) {
  return Boolean(url && EXTERNAL_URL_REGEX.test(url));
}

function parseStats(input: unknown): AdminStats {
  if (!input || typeof input !== "object") return {};
  return input as AdminStats;
}

function parseReports(input: unknown): AdminReport[] {
  if (!Array.isArray(input)) return [];
  return input as AdminReport[];
}

export default function AdminDashboardClient({
  initialRange,
  initialStatus,
  initialStats,
  initialReports,
}: AdminDashboardClientProps) {
  const supabase = useSupabase();
  const [range, setRange] = useState<AdminDashboardClientProps["initialRange"]>(
    initialRange
  );
  const [status, setStatus] =
    useState<AdminDashboardClientProps["initialStatus"]>(initialStatus);
  const [stats, setStats] = useState<AdminStats>(() => parseStats(initialStats));
  const [reports, setReports] = useState<AdminReport[]>(() =>
    parseReports(initialReports)
  );
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [pendingReportIds, setPendingReportIds] = useState<Set<string>>(
    () => new Set()
  );
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const [pollQueryInput, setPollQueryInput] = useState("");
  const [pollQuery, setPollQuery] = useState("");
  const [pollVisibility, setPollVisibility] =
    useState<(typeof POLL_VISIBILITY_FILTERS)[number]["value"]>("all");
  const [pollFeaturedFilter, setPollFeaturedFilter] =
    useState<(typeof POLL_FEATURED_FILTERS)[number]["value"]>("all");
  const [polls, setPolls] = useState<AdminPoll[]>([]);
  const [pollsPagination, setPollsPagination] = useState<AdminPollPagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasNextPage: false,
    nextOffset: null,
  });
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [pendingPollIds, setPendingPollIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pollOptionImageInputs, setPollOptionImageInputs] = useState<
    Record<string, string>
  >({});
  const [editingPollId, setEditingPollId] = useState<string | null>(null);

  const statCards = useMemo(
    () => [
      {
        label: "생성된 투표",
        value: stats.polls_created ?? 0,
        helper: `range: ${range}`,
      },
      {
        label: "투표 수(로그인)",
        value: stats.authenticated_votes_cast ?? 0,
        helper: "user_votes 기준",
      },
      {
        label: "즐겨찾기 추가",
        value: stats.favorites_added ?? 0,
        helper: "favorite_polls 기준",
      },
      {
        label: "활성 사용자",
        value: stats.active_users ?? 0,
        helper: "기간 내 투표 사용자",
      },
      {
        label: "오픈 신고",
        value: stats.open_reports ?? 0,
        helper: "status=open",
      },
      {
        label: "대표 투표",
        value: stats.featured_polls ?? 0,
        helper: "is_featured=true",
      },
    ],
    [range, stats]
  );

  const refreshStats = useCallback(async (nextRange: string) => {
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/admin/stats?range=${nextRange}`, {
        method: "GET",
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: string;
      };

      if (!response.ok) {
        const toast = await getToast();
        toast.error(payload.error || "지표를 불러오지 못했습니다.");
        return;
      }

      setStats(parseStats(payload.data));
    } catch (error) {
      console.error("Failed to refresh stats:", error);
      const toast = await getToast();
      toast.error("지표 요청 중 오류가 발생했습니다.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const parsePolls = useCallback((input: unknown): AdminPoll[] => {
    if (!Array.isArray(input)) return [];
    return input as AdminPoll[];
  }, []);

  const parsePollPagination = useCallback((input: unknown): AdminPollPagination => {
    if (!input || typeof input !== "object") {
      return {
        total: 0,
        limit: 20,
        offset: 0,
        hasNextPage: false,
        nextOffset: null,
      };
    }
    return input as AdminPollPagination;
  }, []);

  const refreshPolls = useCallback(
    async (nextOffset: number, overrides?: Partial<{ q: string; visibility: string; featured: string }>) => {
      setLoadingPolls(true);
      try {
        const nextQuery = overrides?.q ?? pollQuery;
        const nextVisibility = overrides?.visibility ?? pollVisibility;
        const nextFeatured = overrides?.featured ?? pollFeaturedFilter;

        const query = new URLSearchParams({
          q: nextQuery,
          visibility: nextVisibility,
          featured: nextFeatured,
          limit: String(pollsPagination.limit),
          offset: String(nextOffset),
        });

        const response = await fetch(`/api/admin/polls?${query.toString()}`, {
          method: "GET",
        });

        const payload = (await response.json()) as {
          data?: unknown;
          pagination?: unknown;
          error?: string;
        };

        if (!response.ok) {
          const toast = await getToast();
          toast.error(payload.error || "투표 목록을 불러오지 못했습니다.");
          return;
        }

        setPolls(parsePolls(payload.data));
        const parsedPagination = parsePollPagination(payload.pagination);
        setPollsPagination(parsedPagination);
      } catch (error) {
        console.error("Failed to refresh polls:", error);
        const toast = await getToast();
        toast.error("투표 목록 요청 중 오류가 발생했습니다.");
      } finally {
        setLoadingPolls(false);
      }
    },
    [parsePollPagination, parsePolls, pollFeaturedFilter, pollQuery, pollVisibility, pollsPagination.limit]
  );

  useEffect(() => {
    void refreshPolls(0);
  }, [pollFeaturedFilter, pollQuery, pollVisibility, refreshPolls]);

  const applyPollSearch = useCallback(() => {
    const nextQuery = pollQueryInput.trim();
    setPollQuery(nextQuery);
  }, [pollQueryInput]);

  const withPendingPoll = useCallback(async (id: string, action: () => Promise<void>) => {
    setPendingPollIds((prev) => new Set(prev).add(id));
    try {
      await action();
    } finally {
      setPendingPollIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const handleTogglePollFeatured = useCallback(
    async (pollId: string, nextIsFeatured: boolean) => {
      await withPendingPoll(pollId, async () => {
        try {
          const response = await fetch(`/api/admin/polls/${pollId}/feature`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isFeatured: nextIsFeatured }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "대표 설정 변경에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success(nextIsFeatured ? "대표 투표로 지정했습니다." : "대표 투표를 해제했습니다.");
          await refreshPolls(pollsPagination.offset);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to toggle featured:", error);
          const toast = await getToast();
          toast.error("요청 중 오류가 발생했습니다.");
        }
      });
    },
    [pollsPagination.offset, range, refreshPolls, refreshStats, withPendingPoll]
  );

  const handlePollVisibilityFromList = useCallback(
    async (pollId: string, nextIsPublic: boolean) => {
      await withPendingPoll(pollId, async () => {
        try {
          const response = await fetch(`/api/admin/polls/${pollId}/visibility`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublic: nextIsPublic }),
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "공개 설정 변경에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success("공개 설정을 변경했습니다.");
          await refreshPolls(pollsPagination.offset);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to update poll visibility:", error);
          const toast = await getToast();
          toast.error("요청 중 오류가 발생했습니다.");
        }
      });
    },
    [pollsPagination.offset, range, refreshPolls, refreshStats, withPendingPoll]
  );

  const handleDeletePollFromList = useCallback(
    async (pollId: string) => {
      const confirmed = window.confirm(
        "정말로 이 투표를 삭제할까요? (되돌릴 수 없습니다)"
      );
      if (!confirmed) return;

      await withPendingPoll(pollId, async () => {
        try {
          const response = await fetch(`/api/admin/polls/${pollId}`, {
            method: "DELETE",
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "투표 삭제에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success("투표를 삭제했습니다.");
          await refreshPolls(0);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to delete poll:", error);
          const toast = await getToast();
          toast.error("요청 중 오류가 발생했습니다.");
        }
      });
    },
    [range, refreshPolls, refreshStats, withPendingPoll]
  );

  const updateOptionImage = useCallback(
    async (optionId: string, imageUrl: string | null) => {
      try {
        const response = await fetch(`/api/admin/poll-options/${optionId}/image`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          const toast = await getToast();
          toast.error(payload.error || "선택지 이미지 변경에 실패했습니다.");
          return;
        }

        const toast = await getToast();
        toast.success("선택지 이미지를 업데이트했습니다.");
        await refreshPolls(pollsPagination.offset);
        await refreshStats(range);
      } catch (error) {
        console.error("Failed to set option image:", error);
        const toast = await getToast();
        toast.error("요청 중 오류가 발생했습니다.");
      }
    },
    [pollsPagination.offset, range, refreshPolls, refreshStats]
  );

  const handleSetOptionImage = useCallback(
    async (pollId: string, optionId: string, imageUrl: string | null) => {
      await withPendingPoll(pollId, async () => {
        await updateOptionImage(optionId, imageUrl);
      });
    },
    [updateOptionImage, withPendingPoll]
  );

  const handleUploadOptionImage = useCallback(
    async (pollId: string, optionId: string, file: File | null | undefined) => {
      if (!file) return;

      await withPendingPoll(pollId, async () => {
        try {
          const response = await fetch("/api/polls/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            }),
          });

          const result = await response.json().catch(() => null);

          if (!response.ok || !result?.path || !result?.token) {
            const toast = await getToast();
            toast.error(result?.error || "이미지 업로드 URL을 생성하지 못했습니다.");
            return;
          }

          const uploadResult = await supabase.storage
            .from("poll_images")
            .uploadToSignedUrl(result.path, result.token, file, {
              contentType: file.type,
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadResult.error) {
            const toast = await getToast();
            toast.error(uploadResult.error.message || "이미지 업로드에 실패했습니다.");
            return;
          }

          await updateOptionImage(optionId, result.path as string);
        } catch (error) {
          console.error("Failed to upload option image:", error);
          const toast = await getToast();
          toast.error("이미지 업로드 중 오류가 발생했습니다.");
        }
      });
    },
    [supabase.storage, updateOptionImage, withPendingPoll]
  );

  const refreshReports = useCallback(async (nextStatus: string) => {
    setLoadingReports(true);
    try {
      const query = new URLSearchParams({
        status: nextStatus,
        limit: "50",
        offset: "0",
      });
      const response = await fetch(`/api/admin/reports?${query.toString()}`, {
        method: "GET",
      });

      const payload = (await response.json()) as {
        data?: unknown;
        error?: string;
      };

      if (!response.ok) {
        const toast = await getToast();
        toast.error(payload.error || "신고 목록을 불러오지 못했습니다.");
        return;
      }

      setReports(parseReports(payload.data));
    } catch (error) {
      console.error("Failed to refresh reports:", error);
      const toast = await getToast();
      toast.error("신고 목록 요청 중 오류가 발생했습니다.");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const withPending = useCallback(async (id: string, action: () => Promise<void>) => {
    setPendingReportIds((prev) => new Set(prev).add(id));
    try {
      await action();
    } finally {
      setPendingReportIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const handleUpdateReportStatus = useCallback(
    async (reportId: string, nextStatus: string) => {
      await withPending(reportId, async () => {
        try {
          const response = await fetch(`/api/admin/reports/${reportId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: nextStatus,
              adminNote: adminNotes[reportId] ?? "",
            }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "신고 상태 변경에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success("신고 상태를 업데이트했습니다.");
          await refreshReports(status);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to update report status:", error);
          const toast = await getToast();
          toast.error("신고 처리 중 오류가 발생했습니다.");
        }
      });
    },
    [adminNotes, range, refreshReports, refreshStats, status, withPending]
  );

  const handlePollVisibility = useCallback(
    async (pollId: string, nextIsPublic: boolean, reportId: string) => {
      await withPending(reportId, async () => {
        try {
          const response = await fetch(`/api/admin/polls/${pollId}/visibility`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublic: nextIsPublic }),
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "공개 설정 변경에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success("공개 설정을 변경했습니다.");
          await refreshReports(status);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to update poll visibility:", error);
          const toast = await getToast();
          toast.error("요청 중 오류가 발생했습니다.");
        }
      });
    },
    [range, refreshReports, refreshStats, status, withPending]
  );

  const handlePollFeatured = useCallback(
    async (pollId: string, nextIsFeatured: boolean, reportId: string) => {
      await withPending(reportId, async () => {
        try {
          const response = await fetch(`/api/admin/polls/${pollId}/feature`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isFeatured: nextIsFeatured }),
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "대표 지정 변경에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success("대표 투표 설정을 변경했습니다.");
          await refreshReports(status);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to update poll featured:", error);
          const toast = await getToast();
          toast.error("요청 중 오류가 발생했습니다.");
        }
      });
    },
    [range, refreshReports, refreshStats, status, withPending]
  );

  const handleDeletePoll = useCallback(
    async (pollId: string, reportId: string) => {
      const confirmed = window.confirm(
        "정말로 이 투표를 삭제할까요? (되돌릴 수 없습니다)"
      );
      if (!confirmed) return;

      await withPending(reportId, async () => {
        try {
          const response = await fetch(`/api/admin/polls/${pollId}`, {
            method: "DELETE",
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            const toast = await getToast();
            toast.error(payload.error || "투표 삭제에 실패했습니다.");
            return;
          }

          const toast = await getToast();
          toast.success("투표를 삭제했습니다.");
          await refreshReports(status);
          await refreshStats(range);
        } catch (error) {
          console.error("Failed to delete poll:", error);
          const toast = await getToast();
          toast.error("요청 중 오류가 발생했습니다.");
        }
      });
    },
    [range, refreshReports, refreshStats, status, withPending]
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-panel/60 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">운영 지표</p>
            <p className="text-xs text-text-secondary">
              기간 범위를 바꾸면 카드가 갱신됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={range === option ? "default" : "secondary"}
                disabled={loadingStats}
                onClick={async () => {
                  setRange(option);
                  await refreshStats(option);
                }}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={cn(
                "rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-sm",
                loadingStats && "opacity-70"
              )}
            >
              <p className="text-xs text-text-tertiary">{card.label}</p>
              <p className="text-2xl font-bold text-text-primary">
                {Number(card.value).toLocaleString()}
              </p>
              <p className="text-xs text-text-secondary">{card.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-panel/60 p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">신고 관리</p>
            <p className="text-xs text-text-secondary">
              상태 필터를 바꾸면 목록이 갱신됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={status === option ? "default" : "secondary"}
                disabled={loadingReports}
                onClick={async () => {
                  setStatus(option);
                  await refreshReports(option);
                }}
              >
                {STATUS_LABELS[option]}
              </Button>
            ))}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-background/60 p-8 text-center text-sm text-text-secondary">
            신고가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const pending = pendingReportIds.has(report.id);
              const isPoll = report.target_type === "poll" && Boolean(report.poll_id);
              const pollId = report.poll_id ?? "";
              const pollQuestion = report.poll_question ?? "(제목 없음)";
              const nextVisibility = report.poll_is_public === true ? false : true;
              const nextFeatured = report.poll_is_featured === true ? false : true;
              const noteValue = adminNotes[report.id] ?? report.admin_note ?? "";

              return (
                <div
                  key={report.id}
                  className={cn(
                    "rounded-2xl border border-border bg-background/70 p-4 space-y-3",
                    pending && "opacity-70"
                  )}
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-text-tertiary">
                        {report.target_type} · {report.reason_code} ·{" "}
                        {getReportStatusLabel(report.status)}
                      </p>
                      {isPoll ? (
                        <a
                          href={`/poll/${pollId}`}
                          className="text-sm font-semibold text-text-primary hover:text-primary"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {pollQuestion}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-text-primary">
                          사용자 신고: {report.target_username ?? report.target_user_id}
                        </p>
                      )}
                      <p className="text-xs text-text-secondary">
                        신고자: {report.reporter_username ?? report.reporter_user_id} ·{" "}
                        {new Date(report.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {isPoll ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={pending}
                            onClick={() =>
                              handlePollVisibility(pollId, nextVisibility, report.id)
                            }
                          >
                            {report.poll_is_public ? "비공개 전환" : "공개 전환"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={pending}
                            onClick={() =>
                              handlePollFeatured(pollId, nextFeatured, report.id)
                            }
                          >
                            {report.poll_is_featured ? "대표 해제" : "대표 지정"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={pending}
                            onClick={() => handleDeletePoll(pollId, report.id)}
                          >
                            삭제
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {report.reason_detail ? (
                    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-text-secondary">
                      {report.reason_detail}
                    </div>
                  ) : null}

                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                    <textarea
                      value={noteValue}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({
                          ...prev,
                          [report.id]: e.target.value,
                        }))
                      }
                      disabled={pending}
                      rows={2}
                      placeholder="관리자 메모 (선택)"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleUpdateReportStatus(report.id, "resolved")}
                      >
                        {STATUS_ACTION_LABELS.resolved}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleUpdateReportStatus(report.id, "dismissed")}
                      >
                        {STATUS_ACTION_LABELS.dismissed}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleUpdateReportStatus(report.id, "open")}
                      >
                        {STATUS_ACTION_LABELS.open}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-panel/60 p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">투표 관리</p>
            <p className="text-xs text-text-secondary">
              검색/필터로 투표를 찾고 선택지(투표 대상) 이미지 및 대표 투표 지정 등을 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loadingPolls}
              onClick={() => void refreshPolls(0)}
            >
              새로고침
            </Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
          <Input
            value={pollQueryInput}
            onChange={(e) => setPollQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyPollSearch();
              }
            }}
            placeholder="질문 검색 또는 Poll ID(UUID) 입력"
            disabled={loadingPolls}
          />
          <Button
            type="button"
            size="sm"
            disabled={loadingPolls}
            onClick={() => applyPollSearch()}
          >
            검색
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loadingPolls && pollQuery.length === 0 && pollQueryInput.length === 0}
            onClick={() => {
              setPollQueryInput("");
              setPollQuery("");
            }}
          >
            초기화
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-tertiary">공개:</span>
          {POLL_VISIBILITY_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={pollVisibility === filter.value ? "default" : "secondary"}
              disabled={loadingPolls}
              onClick={() => setPollVisibility(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
          <span className="ml-2 text-xs font-semibold text-text-tertiary">
            대표:
          </span>
          {POLL_FEATURED_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={pollFeaturedFilter === filter.value ? "default" : "secondary"}
              disabled={loadingPolls}
              onClick={() => setPollFeaturedFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-xs text-text-secondary md:flex-row md:items-center md:justify-between">
          <p>
            총 {pollsPagination.total.toLocaleString()}개 ·{" "}
            {pollsPagination.total === 0
              ? "0"
              : `${pollsPagination.offset + 1}-${Math.min(
                  pollsPagination.offset + pollsPagination.limit,
                  pollsPagination.total
                )}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loadingPolls || pollsPagination.offset <= 0}
              onClick={() =>
                void refreshPolls(Math.max(0, pollsPagination.offset - pollsPagination.limit))
              }
            >
              이전
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={
                loadingPolls || !pollsPagination.hasNextPage || pollsPagination.nextOffset === null
              }
              onClick={() =>
                pollsPagination.nextOffset !== null
                  ? void refreshPolls(pollsPagination.nextOffset)
                  : undefined
              }
            >
              다음
            </Button>
          </div>
        </div>

        {loadingPolls && polls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-background/60 p-8 text-center text-sm text-text-secondary">
            투표 목록을 불러오는 중입니다...
          </div>
        ) : polls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-background/60 p-8 text-center text-sm text-text-secondary">
            조건에 해당하는 투표가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => {
              const pending = pendingPollIds.has(poll.id);
              const canFeature = poll.allOptionsHaveImages;
              const nextIsFeatured = !poll.isFeatured;
              const nextIsPublic = !poll.isPublic;
              const isEditing = editingPollId === poll.id;

              return (
                <div
                  key={poll.id}
                  className={cn(
                    "rounded-2xl border border-border bg-background/70 p-4 space-y-3",
                    pending && "opacity-70"
                  )}
                >
	                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
	                    <div className="flex items-start gap-3">
	                      <div className="flex flex-wrap gap-2">
	                        {poll.options.slice(0, 3).map((option) => (
	                          <div
	                            key={option.id}
	                            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-surface"
	                          >
	                            {option.imagePreviewUrl ? (
	                              <img
	                                src={option.imagePreviewUrl}
	                                alt={option.text ?? "선택지 이미지"}
	                                className="h-full w-full object-cover"
	                                loading="lazy"
	                                referrerPolicy="no-referrer"
	                              />
	                            ) : (
	                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-text-tertiary">
	                                {option.hasImage ? "미리보기 불가" : "없음"}
	                              </div>
	                            )}
	                          </div>
	                        ))}
	                        {poll.options.length > 3 ? (
	                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-xs font-semibold text-text-tertiary">
	                            +{poll.options.length - 3}
	                          </div>
	                        ) : null}
	                      </div>

	                      <div className="space-y-1">
	                        <p className="text-xs uppercase tracking-wider text-text-tertiary">
	                          {poll.isPublic ? "공개" : "비공개"} ·{" "}
	                          {poll.isFeatured ? "대표" : "비대표"} ·{" "}
	                          <span
	                            className={cn(
	                              !poll.allOptionsHaveImages && "text-destructive"
	                            )}
	                          >
	                            이미지 {poll.optionsWithImagesCount}/{poll.optionCount}
	                          </span>
	                        </p>
                        <a
                          href={`/poll/${poll.id}`}
                          className="text-sm font-semibold text-text-primary hover:text-primary"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {poll.question ?? "(제목 없음)"}
                        </a>
                        <p className="text-xs text-text-secondary">
                          {new Date(poll.createdAt).toLocaleString("ko-KR")} ·{" "}
                          <span className="break-all">{poll.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => void handlePollVisibilityFromList(poll.id, nextIsPublic)}
                      >
                        {poll.isPublic ? "비공개 전환" : "공개 전환"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending || (nextIsFeatured && !canFeature)}
                        onClick={() =>
                          void handleTogglePollFeatured(poll.id, nextIsFeatured)
                        }
                      >
                        {poll.isFeatured ? "대표 해제" : "대표 지정"}
                      </Button>

	                      <Button
	                        type="button"
	                        size="sm"
	                        variant="secondary"
	                        disabled={pending}
	                        onClick={() => {
	                          const next = isEditing ? null : poll.id;
	                          setEditingPollId(next);
	                          if (next) {
	                            setPollOptionImageInputs((prev) => {
	                              const nextInputs = { ...prev };
	                              poll.options.forEach((option) => {
	                                if (nextInputs[option.id] !== undefined) return;
	                                nextInputs[option.id] = isExternalUrl(option.imageUrl)
	                                  ? option.imageUrl ?? ""
	                                  : "";
	                              });
	                              return nextInputs;
	                            });
	                          }
	                        }}
	                      >
	                        {isEditing ? "편집 닫기" : "선택지 이미지"}
	                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => void handleDeletePollFromList(poll.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>

	                  {!poll.allOptionsHaveImages && poll.isFeatured ? (
	                    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-destructive">
	                      현재 대표 투표인데 선택지 이미지가 누락되어 있습니다. (데이터 정합성 확인 필요)
	                    </div>
	                  ) : null}

	                  {!poll.allOptionsHaveImages && !poll.isFeatured ? (
	                    <p className="text-xs text-text-secondary">
	                      대표 투표로 지정하려면 모든 선택지 이미지를 먼저 설정해야 합니다.
	                    </p>
	                  ) : null}

	                  {isEditing ? (
	                    <div className="rounded-2xl border border-border-subtle bg-surface/60 p-4 space-y-4">
	                      <p className="text-xs text-text-secondary">
	                        대표 투표로 지정하려면 모든 선택지에 이미지가 있어야 합니다.
	                      </p>

	                      <div className="space-y-3">
	                        {poll.options.map((option) => {
	                          const inputValue =
	                            pollOptionImageInputs[option.id] ?? "";

	                          return (
	                            <div
	                              key={option.id}
	                              className={cn(
	                                "rounded-xl border border-border bg-background/70 p-3 space-y-3",
	                                pending && "opacity-70"
	                              )}
	                            >
	                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
	                                <div className="flex items-start gap-3">
	                                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
	                                    {option.imagePreviewUrl ? (
	                                      <img
	                                        src={option.imagePreviewUrl}
	                                        alt={option.text ?? "선택지 이미지"}
	                                        className="h-full w-full object-cover"
	                                        loading="lazy"
	                                        referrerPolicy="no-referrer"
	                                      />
	                                    ) : (
	                                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-text-tertiary">
	                                        {option.hasImage
	                                          ? "미리보기 불가"
	                                          : "없음"}
	                                      </div>
	                                    )}
	                                  </div>
	                                  <div className="space-y-1">
	                                    <p className="text-sm font-semibold text-text-primary">
	                                      {option.text ?? "(텍스트 없음)"}
	                                    </p>
	                                    <p className="text-xs text-text-tertiary">
	                                      {option.hasImage
	                                        ? isExternalUrl(option.imageUrl)
	                                          ? "외부 URL"
	                                          : "업로드"
	                                        : "이미지 없음"}
	                                    </p>
	                                  </div>
	                                </div>
	                              </div>

	                              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-center">
	                                <Input
	                                  value={inputValue}
	                                  onChange={(e) =>
	                                    setPollOptionImageInputs((prev) => ({
	                                      ...prev,
	                                      [option.id]: e.target.value,
	                                    }))
	                                  }
	                                  placeholder="https://... 또는 poll_images/... (path)"
	                                  disabled={pending}
	                                />
	                                <Button
	                                  type="button"
	                                  size="sm"
	                                  disabled={pending}
	                                  onClick={async () => {
	                                    const next = inputValue.trim();
	                                    if (!next) {
	                                      const toast = await getToast();
	                                      toast.error(
	                                        "이미지 URL/경로를 입력하거나 업로드해 주세요."
	                                      );
	                                      return;
	                                    }
	                                    await handleSetOptionImage(
	                                      poll.id,
	                                      option.id,
	                                      next
	                                    );
	                                  }}
	                                >
	                                  적용
	                                </Button>
	                                <Button
	                                  type="button"
	                                  size="sm"
	                                  variant="destructive"
	                                  disabled={
	                                    pending || poll.isFeatured || !option.hasImage
	                                  }
	                                  onClick={() => {
	                                    setPollOptionImageInputs((prev) => ({
	                                      ...prev,
	                                      [option.id]: "",
	                                    }));
	                                    void handleSetOptionImage(
	                                      poll.id,
	                                      option.id,
	                                      null
	                                    );
	                                  }}
	                                >
	                                  제거
	                                </Button>
	                              </div>

	                              <div className="flex flex-wrap items-center gap-3">
	                                <label
	                                  htmlFor={`poll-option-image-upload-${option.id}`}
	                                  className={cn(
	                                    "inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-text-primary hover:border-primary",
	                                    pending && "pointer-events-none opacity-60"
	                                  )}
	                                >
	                                  이미지 업로드
	                                  {pending ? (
	                                    <span className="text-xs text-text-secondary">
	                                      (처리 중)
	                                    </span>
	                                  ) : null}
	                                </label>
	                                <input
	                                  id={`poll-option-image-upload-${option.id}`}
	                                  type="file"
	                                  accept="image/jpeg,image/png,image/webp"
	                                  className="hidden"
	                                  disabled={pending}
	                                  onChange={(e) => {
	                                    const file = e.target.files?.[0];
	                                    e.target.value = "";
	                                    void handleUploadOptionImage(
	                                      poll.id,
	                                      option.id,
	                                      file
	                                    );
	                                  }}
	                                />
	                                <p className="text-xs text-text-secondary">
	                                  외부 URL은 http/https만 지원하며, Supabase 서명 URL은 저장할 수 없습니다.
	                                </p>
	                              </div>
	                            </div>
	                          );
	                        })}
	                      </div>
	                    </div>
	                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
