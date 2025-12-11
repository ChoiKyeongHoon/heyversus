import PollPageClient from "./PollPageClient";

export const revalidate = 300;

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PollPageClient pollId={id} />;
}
