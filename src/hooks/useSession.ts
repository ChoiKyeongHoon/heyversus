import { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { useSupabase } from "./useSupabase";

/**
 * Supabase 세션 상태를 관리하는 커스텀 훅
 *
 * @returns {Object} 세션 객체
 * @returns {Session | null} session - 현재 Supabase 세션
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { session } = useSession();
 *
 *   if (!session) {
 *     return <p>로그인이 필요합니다.</p>;
 *   }
 *
 *   return <p>환영합니다, {session.user.email}!</p>;
 * }
 * ```
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return { session };
}
