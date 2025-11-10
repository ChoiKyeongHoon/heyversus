"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { STORAGE_KEYS } from "@/constants/storage";
import { useSession } from "@/hooks/useSession";

const readAnonymousVotes = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.VOTED_POLLS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Failed to parse anonymous vote storage", error);
    return [];
  }
};

export function useVoteStatus(initialServerVotedIds: string[] = []) {
  const { session } = useSession();
  const [serverVotedIds, setServerVotedIds] = useState(initialServerVotedIds);
  const [anonymousVotedIds, setAnonymousVotedIds] = useState<string[]>([]);

  const areArraysEqual = useCallback((a: string[], b: string[]) => {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }, []);

  useEffect(() => {
    if (!areArraysEqual(serverVotedIds, initialServerVotedIds)) {
      setServerVotedIds(initialServerVotedIds);
    }
  }, [initialServerVotedIds, areArraysEqual, serverVotedIds]);

  useEffect(() => {
    if (session) {
      setAnonymousVotedIds([]);
    } else {
      setAnonymousVotedIds(readAnonymousVotes());
    }
  }, [session]);

  const votedPolls = useMemo(
    () => (session ? serverVotedIds : anonymousVotedIds),
    [session, serverVotedIds, anonymousVotedIds]
  );

  const hasVoted = useCallback(
    (pollId: string) => votedPolls.includes(pollId),
    [votedPolls]
  );

  const markVoted = useCallback(
    (pollId: string) => {
      if (session) {
        setServerVotedIds((prev) =>
          prev.includes(pollId) ? prev : [...prev, pollId]
        );
        return;
      }

      setAnonymousVotedIds((prev) => {
        if (prev.includes(pollId)) {
          return prev;
        }
        const updated = [...prev, pollId];
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            STORAGE_KEYS.VOTED_POLLS,
            JSON.stringify(updated)
          );
        }
        return updated;
      });
    },
    [session]
  );

  return {
    session,
    hasVoted,
    markVoted,
    votedPolls,
    refreshAnonymousVotes: () => setAnonymousVotedIds(readAnonymousVotes()),
  };
}
