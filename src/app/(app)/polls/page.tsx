import { getPolls } from "@/actions/poll-queries";
import { PollsList } from "@/components/polls/poll-card";
import type { PollData } from "@/components/polls/poll-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ankety" };

export default async function PollsPage() {
  const polls = await getPolls();

  return <PollsList polls={polls as unknown as PollData[]} />;
}
