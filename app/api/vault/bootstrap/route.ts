import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { bootstrapVaultForUser } from "@/lib/server/sync-service";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await bootstrapVaultForUser(userId);
  return NextResponse.json(result);
}
