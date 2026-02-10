import { getPostDetail } from "@/actions/news-queries";
import { PostDetailPage } from "@/components/news/post-detail-page";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const post = await getPostDetail(id);
    return { title: post?.title || "Novinka" };
  } catch {
    return { title: "Novinka" };
  }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await getPostDetail(id);
  if (!post) return notFound();

  // Serialize dates for client component
  const serialized = JSON.parse(JSON.stringify(post));
  return <PostDetailPage post={serialized} />;
}
