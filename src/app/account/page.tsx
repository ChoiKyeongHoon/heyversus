import { redirect } from "next/navigation";

import AccountClient from "@/app/account/AccountClient";
import { getCurrentProfile } from "@/lib/services/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/signin?redirect=/account");
  }

  const { data: profile, error } = await getCurrentProfile();

  if (error || !profile) {
    console.error("Error fetching profile:", error);
    return (
      <main
        className="container mx-auto p-4 flex flex-col items-center justify-center"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <h1 className="text-3xl font-bold text-center my-4 text-destructive drop-shadow-lg">
          프로필을 불러오는데 실패했습니다.
        </h1>
        <p className="text-muted-foreground">잠시 후 다시 시도해주세요.</p>
      </main>
    );
  }

  return (
    <main
      className="container mx-auto p-4 flex flex-col"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <AccountClient initialProfile={profile} />
    </main>
  );
}
