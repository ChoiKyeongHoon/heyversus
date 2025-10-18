import { useEffect, useState } from "react";

/**
 * localStorage를 React 상태와 동기화하는 범용 커스텀 훅
 *
 * @template T - 저장할 값의 타입
 * @param {string} key - localStorage 키
 * @param {T} initialValue - 초기값
 * @returns {[T, (value: T | ((val: T) => T)) => void]} [현재 값, 값 설정 함수]
 *
 * @example
 * ```tsx
 * const [votedPolls, setVotedPolls] = useLocalStorage<string[]>('voted-polls', []);
 *
 * // 값 추가
 * setVotedPolls([...votedPolls, 'new-poll-id']);
 *
 * // 함수형 업데이트
 * setVotedPolls(prev => [...prev, 'another-poll-id']);
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (_value: T | ((_val: T) => T)) => void] {
  // 초기 상태 설정 (클라이언트 사이드에서만 localStorage 접근)
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 값 설정 함수 (localStorage와 state 동시 업데이트)
  const setValue = (_value: T | ((_val: T) => T)) => {
    try {
      // 함수형 업데이트 지원
      const valueToStore =
        _value instanceof Function ? _value(storedValue) : _value;

      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // 다른 탭/윈도우에서 localStorage 변경 감지
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
