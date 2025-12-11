import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { NextRequest } from "next/server";

import { GET as getPollByIdApi } from "@/app/api/polls/[id]/route";
import { GET as getPollsApi, POST as createPollApi } from "@/app/api/polls/route";
import { usePollVote } from "@/hooks/usePollVote";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import type { PollWithOptions } from "@/lib/types";

const mockGetPollsPaginated = jest.fn();
const mockCreatePoll = jest.fn();
const mockGetPollById = jest.fn();
const mockCreateClient = jest.fn();
const mockLogScoreEvent = jest.fn().mockResolvedValue({ error: null });
const mockUseSupabase = jest.fn();
const mockSubmitVoteRequest = jest.fn();
const mockGetToast = jest.fn().mockResolvedValue({
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
});

jest.mock("@/lib/services/polls", () => ({
  getPollsPaginated: (...args: unknown[]) => mockGetPollsPaginated(...args),
  createPoll: (...args: unknown[]) => mockCreatePoll(...args),
  getPollById: (...args: unknown[]) => mockGetPollById(...args),
}));

jest.mock("@/lib/services/scoreEvents", () => ({
  logScoreEvent: (...args: unknown[]) => mockLogScoreEvent(...args),
  logScoreEventClient: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

jest.mock("@/hooks/useSupabase", () => ({
  useSupabase: () => mockUseSupabase(),
}));

jest.mock("@/lib/api/vote", () => ({
  submitVoteRequest: (...args: unknown[]) => mockSubmitVoteRequest(...args),
}));

jest.mock("@/lib/toast", () => ({
  getToast: () => mockGetToast(),
}));

function createQueryWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("API routes: /api/polls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns paginated polls with provided query params", async () => {
    mockGetPollsPaginated.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 0,
          hasNextPage: false,
          nextOffset: null,
        },
      },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost/api/polls?limit=10&offset=0&sortBy=created_at&sortOrder=desc&filterStatus=all"
    );

    const response = await getPollsApi(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(mockGetPollsPaginated).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      sortBy: "created_at",
      sortOrder: "desc",
      filterStatus: "all",
    });
  });

  it("rejects unauthenticated poll creation", async () => {
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: async () => ({ data: { session: null } }),
      },
    });
    const authError = Object.assign(new Error("Not authenticated"), {
      code: "AUTH_REQUIRED",
    });
    mockCreatePoll.mockResolvedValue({ data: null, error: authError });

    const request = new NextRequest("http://localhost/api/polls", {
      method: "POST",
      body: JSON.stringify({
        question: "Question?",
        options: ["A", "B"],
        isPublic: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await createPollApi(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("로그인");
  });
});

describe("API routes: /api/polls/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when poll is not found", async () => {
    mockGetPollById.mockResolvedValue({ data: null, error: null });

    const response = await getPollByIdApi(new NextRequest("http://localhost/api/polls/abc"), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Poll not found");
  });

  it("returns 403 on permission denied errors", async () => {
    mockGetPollById.mockResolvedValue({
      data: null,
      error: new Error("permission denied"),
    });

    const response = await getPollByIdApi(new NextRequest("http://localhost/api/polls/abc"), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("permission denied");
  });
});

describe("Hooks: usePollVote and useToggleFavorite", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockUseSupabase.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
      rpc: jest.fn(),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rolls back optimistic update when vote fails", async () => {
    mockSubmitVoteRequest.mockRejectedValue(new Error("vote failed"));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = createQueryWrapper(client);

    const initialPoll: PollWithOptions = {
      id: "poll-1",
      created_at: "",
      question: "Q",
      created_by: "",
      is_public: true,
      is_featured: false,
      featured_image_url: null,
      expires_at: null,
      status: "active",
      has_voted: false,
      poll_options: [
        {
          id: "opt-1",
          created_at: "",
          text: "A",
          poll_id: "poll-1",
          votes: 0,
          image_url: null,
          position: 1,
        },
      ],
    };

    client.setQueryData(["poll-detail", "poll-1"], initialPoll);

    const { result } = renderHook(() => usePollVote(), { wrapper: Wrapper });

    await expect(
      result.current.mutateAsync({ pollId: "poll-1", optionId: "opt-1" })
    ).rejects.toThrow("vote failed");

    const restored = client.getQueryData<PollWithOptions>([
      "poll-detail",
      "poll-1",
    ]);
    expect(restored?.has_voted).toBe(false);
    expect(restored?.poll_options[0].votes).toBe(0);
  });

  it("handles favorite toggle success and permission errors", async () => {
    const rpcMock = jest.fn();
    mockUseSupabase.mockReturnValue({ rpc: rpcMock });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = createQueryWrapper(client);

    rpcMock.mockResolvedValueOnce({
      data: [{ is_favorited: true }],
      error: null,
    });

    const { result: successResult } = renderHook(() => useToggleFavorite(), {
      wrapper: Wrapper,
    });

    const success = await successResult.current.mutateAsync({ pollId: "poll-x" });
    expect(success.isFavorited).toBe(true);

    rpcMock.mockResolvedValueOnce({
      data: null,
      error: new Error("permission denied"),
    });

    const { result: errorResult } = renderHook(() => useToggleFavorite(), {
      wrapper: Wrapper,
    });

    await expect(
      errorResult.current.mutateAsync({ pollId: "poll-x" })
    ).rejects.toThrow("permission denied");
  });
});
