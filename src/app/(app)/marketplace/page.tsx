import { getListings } from "@/actions/marketplace-queries";
import { auth } from "@/lib/auth";
import { MarketplaceFeed } from "@/components/marketplace/listing-card";
import { CreateListingForm } from "@/components/marketplace/create-listing-form";
import type { ListingData } from "@/components/marketplace/listing-card";
import { Store } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tržiště" };

export default async function MarketplacePage() {
  const [listings, session] = await Promise.all([getListings(), auth()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/30">
          <Store className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tržiště</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interní nástěnka pro kolegy
          </p>
        </div>
      </div>

      <CreateListingForm />

      <MarketplaceFeed
        listings={listings as unknown as ListingData[]}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
