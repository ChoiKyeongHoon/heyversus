import { createClient } from "@/lib/supabase/server";
import PollClient from "./PollClient";
import { PollWithOptions } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic"; // 항상 동적으로 렌더링

async function getPoll(id: string): Promise<PollWithOptions | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_poll_with_user_status", { p_id: id })
    .single();

  if (error) {
    console.error(`Error fetching poll with id ${id}:`, error);
    return null;
  }

  return data as PollWithOptions;
}

export default async function PollPage({ params }: { params: { id: string } }) {
  const pollData = await getPoll(params.id);

  if (!pollData) {
    notFound();
  }

  // The data structure from Supabase now matches the PollWithOptions type perfectly.
  return <PollClient poll={pollData} />;
}
