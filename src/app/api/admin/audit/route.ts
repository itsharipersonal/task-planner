import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/admin/audit";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin();
  if ("error" in admin) return admin.error;

  const url = new URL(request.url);
  const logs = await getAuditLogs(
    admin.env.DB,
    Number(url.searchParams.get("limit") ?? 50),
    Number(url.searchParams.get("offset") ?? 0),
  );

  return NextResponse.json({ logs });
}
