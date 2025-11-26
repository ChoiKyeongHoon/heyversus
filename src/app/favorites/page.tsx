import { redirect } from "next/navigation";

import FavoritesClient from "@/app/favorites/FavoritesClient";
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
    <FavoritesClient serverPolls={favoritePolls ?? []} />
  );
}
