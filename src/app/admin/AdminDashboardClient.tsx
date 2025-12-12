"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
                {option}
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
                        {report.status}
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
                        resolved
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleUpdateReportStatus(report.id, "dismissed")}
                      >
                        dismissed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => handleUpdateReportStatus(report.id, "open")}
                      >
                        reopen
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

