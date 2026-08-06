import { UserDetailPanel } from "@/components/admin/user-detail-panel";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailPanel userId={id} />;
}
