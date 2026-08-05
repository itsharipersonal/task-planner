import { auth } from "@/app/auth";
import { NextResponse } from "next/server";

export async function requireUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId: session.user.id };
}
