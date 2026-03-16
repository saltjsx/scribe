import { describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const pushRemoteMutationsMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/server/sync-service", () => ({
  pushRemoteMutations: pushRemoteMutationsMock,
}));

describe("POST /api/sync/push", () => {
  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("@/app/api/sync/push/route");

    const response = await POST(
      new Request("http://localhost/api/sync/push", {
        method: "POST",
        body: JSON.stringify({ mutations: [] }),
      })
    );

    expect(response.status).toBe(401);
    expect(pushRemoteMutationsMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated user instead of any user ids in the payload", async () => {
    authMock.mockResolvedValue({ userId: "real-user" });
    pushRemoteMutationsMock.mockResolvedValue({
      acceptedMutationIds: [],
      discardedMutationIds: [],
      cursor: null,
    });
    const { POST } = await import("@/app/api/sync/push/route");

    const response = await POST(
      new Request("http://localhost/api/sync/push", {
        method: "POST",
        body: JSON.stringify({
          mutations: [
            {
              userId: "other-user",
              entryId: "entry-1",
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(pushRemoteMutationsMock).toHaveBeenCalledWith(
      "real-user",
      expect.arrayContaining([
        expect.objectContaining({
          userId: "other-user",
          entryId: "entry-1",
        }),
      ])
    );
  });
});
