import { describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const pullRemoteChangesMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/server/sync-service", () => ({
  pullRemoteChanges: pullRemoteChangesMock,
}));

describe("POST /api/sync/pull", () => {
  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("@/app/api/sync/pull/route");

    const response = await POST(
      new Request("http://localhost/api/sync/pull", {
        method: "POST",
        body: JSON.stringify({ cursor: null }),
      })
    );

    expect(response.status).toBe(401);
    expect(pullRemoteChangesMock).not.toHaveBeenCalled();
  });

  it("scopes pulls to the authenticated user", async () => {
    authMock.mockResolvedValue({ userId: "real-user" });
    pullRemoteChangesMock.mockResolvedValue({ records: [], cursor: "cursor-1" });
    const { POST } = await import("@/app/api/sync/pull/route");

    const response = await POST(
      new Request("http://localhost/api/sync/pull", {
        method: "POST",
        body: JSON.stringify({ cursor: "cursor-0", userId: "other-user" }),
      })
    );

    expect(response.status).toBe(200);
    expect(pullRemoteChangesMock).toHaveBeenCalledWith("real-user", "cursor-0");
  });
});
