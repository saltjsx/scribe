import { describe, expect, it } from "vitest";
import { compareRecordVersion, shouldReplaceRecord } from "@/lib/sync/merge";

describe("sync merge rules", () => {
  it("prefers newer updatedAt timestamps", () => {
    expect(
      shouldReplaceRecord(
        {
          updatedAt: "2026-03-16T08:00:00.000Z",
          deviceId: "device-a",
          lastMutationId: "1",
        },
        {
          updatedAt: "2026-03-16T09:00:00.000Z",
          deviceId: "device-b",
          lastMutationId: "2",
        }
      )
    ).toBe(true);
  });

  it("breaks timestamp ties by device id", () => {
    expect(
      compareRecordVersion(
        {
          updatedAt: "2026-03-16T09:00:00.000Z",
          deviceId: "device-b",
          lastMutationId: "2",
        },
        {
          updatedAt: "2026-03-16T09:00:00.000Z",
          deviceId: "device-a",
          lastMutationId: "3",
        }
      )
    ).toBeGreaterThan(0);
  });

  it("breaks full ties by mutation id", () => {
    expect(
      compareRecordVersion(
        {
          updatedAt: "2026-03-16T09:00:00.000Z",
          deviceId: "device-a",
          lastMutationId: "2",
        },
        {
          updatedAt: "2026-03-16T09:00:00.000Z",
          deviceId: "device-a",
          lastMutationId: "1",
        }
      )
    ).toBeGreaterThan(0);
  });
});
