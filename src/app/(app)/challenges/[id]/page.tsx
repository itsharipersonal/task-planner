import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { ChallengeRunner } from "@/components/challenges/challenge-runner";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;
  return <ChallengeRunner attemptId={id} />;
}
