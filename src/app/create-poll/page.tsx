import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import CreatePollClient from "./CreatePollClient";

export default async function CreatePollPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/signin?redirect=/create-poll");
  }

  return <CreatePollClient />;
}
