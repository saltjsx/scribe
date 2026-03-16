import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { pullRemoteChanges } from "@/lib/server/sync-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { cursor?: string | null };
  const result = await pullRemoteChanges(userId, body.cursor ?? null);

  return NextResponse.json(result);
}
