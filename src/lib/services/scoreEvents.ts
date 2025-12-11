import type { SupabaseClient } from "@supabase/supabase-js";

import { getAnonServerClient } from "@/lib/supabase/anon-server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type { ScoreEventType } from "@/lib/types";

export interface LogScoreEventParams {
  eventType: ScoreEventType;
  pollId?: string | null;
  weightOverride?: number | null;
  metadata?: Record<string, unknown> | null;
  userId?: string | null;
}

export interface LogScoreEventResult {
  id: string;
  user_id: string;
  event_type: ScoreEventType;
  poll_id: string | null;
  weight: number;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

type LogScoreEventOptions = {
  supabase?: SupabaseClient;
  useAnonClient?: boolean;
  useServiceRole?: boolean;
};

export async function logScoreEvent(
  params: LogScoreEventParams,
  options: LogScoreEventOptions = {}
): Promise<{ data: LogScoreEventResult | null; error: Error | null }> {
  const {
    eventType,
    pollId = null,
    weightOverride = null,
    metadata = null,
    userId = null,
  } = params;

  const supabase =
    options.useServiceRole
      ? getServiceRoleClient()
      : options.supabase
        ? options.supabase
        : options.useAnonClient
          ? getAnonServerClient()
          : await createClient();

  const { data, error } = await supabase.rpc("log_score_event", {
    p_event_type: eventType,
    p_poll_id: pollId,
    p_weight_override: weightOverride,
    p_metadata: metadata,
    p_user_id: userId,
  });

  if (error) {
    console.error("Error logging score event:", error);
    return { data: null, error };
  }

  const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

  return { data: result as LogScoreEventResult, error: null };
}

export async function logScoreEventClient(
  params: LogScoreEventParams
): Promise<{ data: LogScoreEventResult | null; error: Error | null }> {
  try {
    const response = await fetch("/api/score-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      credentials: "same-origin",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const message =
        body?.error || `Failed to log score event (status ${response.status})`;
      return { data: null, error: new Error(message) };
    }

    const body = (await response.json()) as { data: LogScoreEventResult | null };
    return { data: body.data ?? null, error: null };
  } catch (error) {
    console.error("Error calling score event API:", error);
    return { data: null, error: error as Error };
  }
}
