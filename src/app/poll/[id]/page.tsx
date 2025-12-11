import PollPageClient from "./PollPageClient";

export const revalidate = 300;

export default async function PollPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return <PollPageClient pollId={id} />;
}
