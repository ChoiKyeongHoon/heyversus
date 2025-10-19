import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PollWithOptions } from "@/lib/types";

import PollClient from "./PollClient";

export const dynamic = "force-dynamic"; // 항상 동적으로 렌더링

async function getPoll(id: string): Promise<PollWithOptions | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_poll_with_user_status", {
    p_id: id,
  });

  if (error) {
    console.error(`Error fetching poll with id ${id}:`, error);
    return null;
  }

  // RPC 함수는 권한이 없으면 빈 배열을 반환합니다
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  // 배열의 첫 번째 요소 반환
  const poll = Array.isArray(data) ? data[0] : data;
  return poll as PollWithOptions;
}

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pollData = await getPoll(id);

  if (!pollData) {
    notFound();
  }

  // The data structure from Supabase now matches the PollWithOptions type perfectly.
  return <PollClient poll={pollData} />;
}
