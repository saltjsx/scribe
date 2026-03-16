import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getVaultSessionForUser } from "@/lib/server/sync-service";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getVaultSessionForUser(userId);
  return NextResponse.json(session);
}
