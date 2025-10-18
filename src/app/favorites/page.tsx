import { redirect } from "next/navigation";

import PollsClient from "@/app/polls/PollsClient";
import { getFavoritePolls } from "@/lib/services/polls";
import { createClient } from "@/lib/supabase/server";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/signin?redirect=/favorites");
  }

  const { data: favoritePolls, error } = await getFavoritePolls();

  if (error) {
    console.error("Error fetching favorite polls:", error);
    return (
      <main
        className="container mx-auto p-4 flex flex-col items-center justify-center"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <h1 className="text-3xl font-bold text-center my-4 text-red-500 drop-shadow-lg">
          즐겨찾기 목록을 불러오는데 실패했습니다.
        </h1>
        <p className="text-white">잠시 후 다시 시도해주세요.</p>
      </main>
    );
  }

  return (
    <main
      className="container mx-auto p-4 flex flex-col"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <PollsClient
        serverPolls={favoritePolls ?? []}
        heading="즐겨찾기한 투표"
        emptyState={{
          title: "즐겨찾기한 투표가 없습니다",
          message: "관심 있는 투표를 즐겨찾기에 추가해보세요.",
          actionLabel: "투표 둘러보기",
          actionHref: "/polls",
        }}
        removeOnUnfavorite
      />
    </main>
  );
}
