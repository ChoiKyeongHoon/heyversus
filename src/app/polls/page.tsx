import { createClient } from "@/lib/supabase/server";
import PollsClient from "./PollsClient";

export default async function PollsPage() {
  const supabase = await createClient();
  // 데이터베이스에서 'polls'와 관련된 'poll_options'를 함께 가져옵니다.
  const { data: polls, error } = await supabase.rpc(
    "get_polls_with_user_status"
  );

  if (error) {
    console.error("Error fetching polls:", error);
    return (
      <main
        className="container mx-auto p-4 flex flex-col items-center justify-center"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <h1 className="text-3xl font-bold text-center my-4 text-red-500 drop-shadow-lg">
          데이터를 불러오는 중 오류가 발생했습니다.
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
      <PollsClient serverPolls={polls} />
    </main>
  );
}
