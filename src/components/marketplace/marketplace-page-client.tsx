"use client";

import { useRouter } from "next/navigation";
import { MarketplaceFeed } from "@/components/marketplace/listing-card";
import { CreateListingForm } from "@/components/marketplace/create-listing-form";
import type { ListingData } from "@/components/marketplace/listing-card";

interface MarketplacePageClientProps {
  listings: ListingData[];
  currentUserId?: string;
}

export function MarketplacePageClient({
  listings,
  currentUserId,
}: MarketplacePageClientProps) {
  const router = useRouter();

  const handleContact = (listing: ListingData) => {
    const params = new URLSearchParams({
      partnerId: listing.author.id,
      partnerName: listing.author.name || "",
      listingId: listing.id,
      listingTitle: listing.title,
    });
    router.push(`/messages?${params.toString()}`);
  };

  return (
    <>
      <CreateListingForm />
      <MarketplaceFeed
        listings={listings}
        currentUserId={currentUserId}
        onContact={handleContact}
      />
    </>
  );
}
