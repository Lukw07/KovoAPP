import { auth } from "@/lib/auth";
import { getConversations } from "@/actions/messages";
import { MessagesClient } from "@/components/messages/messages-client";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zprávy" };

interface MessagesPageProps {
  searchParams: Promise<{
    partnerId?: string;
    partnerName?: string;
    partnerAvatar?: string;
    listingId?: string;
    listingTitle?: string;
  }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const [session, conversations, params] = await Promise.all([
    auth(),
    getConversations(),
    searchParams,
  ]);

  if (!session?.user?.id) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
          <MessageCircle className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Zprávy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Soukromé zprávy s kolegy
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
        <MessagesClient
          conversations={conversations}
          currentUserId={session.user.id}
          initialPartnerId={params.partnerId}
          initialPartnerName={params.partnerName}
          initialPartnerAvatar={params.partnerAvatar}
          initialListingId={params.listingId}
          initialListingTitle={params.listingTitle}
        />
      </div>
    </div>
  );
}
