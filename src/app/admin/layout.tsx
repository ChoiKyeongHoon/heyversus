import { redirect } from "next/navigation";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    const err = error as AdminGuardError;

    if (err.status === 401) {
      redirect(`/signin?redirect=${encodeURIComponent("/admin")}`);
    }

    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8">
      <div className="my-8 md:my-10">
        <p className="text-xs uppercase tracking-[0.45em] text-text-tertiary">
          Admin
        </p>
        <h2 className="mt-3 text-xl font-semibold text-text-primary md:text-2xl lg:text-3xl">
          운영 대시보드
        </h2>
        <p className="mt-2 text-sm text-text-secondary md:text-base">
          신고 처리, 대표 투표 지정, 운영 지표 확인
        </p>
      </div>
      {children}
    </div>
  );
}

