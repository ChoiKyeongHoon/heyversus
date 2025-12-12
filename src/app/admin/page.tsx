import AdminDashboardClient from "@/app/admin/AdminDashboardClient";
import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const { supabase } = await requireAdmin();

    const { data: stats } = await supabase.rpc("get_admin_stats", {
      p_range: "7d",
    });

    const { data: reports } = await supabase.rpc("get_reports_admin", {
      p_status: "open",
      p_limit: 50,
      p_offset: 0,
    });

    return (
      <AdminDashboardClient
        initialRange="7d"
        initialStatus="open"
        initialStats={stats}
        initialReports={reports}
      />
    );
  } catch (error) {
    const err = error as AdminGuardError;

    return (
      <div className="rounded-2xl border border-border bg-panel/60 p-6 text-sm text-text-secondary">
        <p className="font-semibold text-text-primary">관리자 페이지 오류</p>
        <p className="mt-2">
          {err.message ||
            "관리자 페이지를 불러오는 중 오류가 발생했습니다."}
        </p>
      </div>
    );
  }
}

