import { useMemo } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Supabase 클라이언트를 useMemo로 최적화하여 반환하는 커스텀 훅
 * 매 렌더링마다 새로운 인스턴스가 생성되는 것을 방지합니다.
 */
export function useSupabase() {
  const supabase = useMemo(() => createClient(), []);
  return supabase;
}
