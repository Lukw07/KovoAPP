import { getNewsFeed } from "@/actions/news-queries";
import { NewsFeed } from "@/components/news/news-feed";
import type { NewsPost } from "@/components/news/news-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novinky" };

export default async function NewsPage() {
  const data = await getNewsFeed(1, 20);

  return (
    <NewsFeed
      initialPosts={data.posts as unknown as NewsPost[]}
      initialTotal={data.total}
    />
  );
}
