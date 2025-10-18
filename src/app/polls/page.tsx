import PollsClientInfinite from "./PollsClientInfinite";

/**
 * Polls List Page with Infinite Scroll
 *
 * Uses client-side data fetching with React Query for infinite scroll,
 * filtering, and sorting capabilities.
 */
export default function PollsPage() {
  return (
    <main
      className="flex flex-col"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <PollsClientInfinite />
    </main>
  );
}
