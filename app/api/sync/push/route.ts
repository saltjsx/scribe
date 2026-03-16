import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { SyncMutation } from "@/lib/entries";
import { pushRemoteMutations } from "@/lib/server/sync-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { mutations?: SyncMutation[] };
  const result = await pushRemoteMutations(userId, body.mutations ?? []);

  return NextResponse.json(result);
}
