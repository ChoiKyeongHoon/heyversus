import { createClient } from "@/lib/supabase/server";

// Ensure server rendering executes on every request (dynamic data)
export const dynamic = "force-dynamic";

async function getProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("username, points")
    .order("points", { ascending: false });

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
  return data;
}

export default async function ScorePage() {
  const profiles = await getProfiles();

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tighter mb-2">
          스코어 보드
        </h1>
        <p className="text-text-secondary text-lg">포인트 랭킹</p>
      </header>

      <main>
        <div className="w-full max-w-2xl mx-auto bg-panel border border-border rounded-lg shadow-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-background-subtle border-b border-border">
              <tr>
                <th className="p-4 text-sm font-semibold text-text-secondary w-1/6 text-center">
                  순위
                </th>
                <th className="p-4 text-sm font-semibold text-text-secondary w-3/6">
                  닉네임
                </th>
                <th className="p-4 text-sm font-semibold text-text-secondary w-2/6 text-right">
                  포인트 (XP)
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile, index) => (
                <tr
                  key={profile.username}
                  className="border-b border-border-subtle last:border-b-0"
                >
                  <td className="p-4 font-semibold text-center">{index + 1}</td>
                  <td className="p-4">{profile.username || "-"}</td>
                  <td className="p-4 font-semibold text-yellow-400 text-right">
                    {profile.points}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center p-8 text-text-secondary"
                  >
                    아직 랭킹 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
