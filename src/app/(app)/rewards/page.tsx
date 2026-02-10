import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRewards, getMyRewardClaims } from "@/actions/reward-queries";
import { RewardsShop } from "@/components/rewards/rewards-shop";

export const metadata = { title: "Odměny" };

export default async function RewardsPage() {
  const session = await auth();
  const user = session?.user;

  const [rewards, claims, freshUser] = await Promise.all([
    getActiveRewards(),
    getMyRewardClaims(),
    prisma.user.findUnique({
      where: { id: user!.id },
      select: { pointsBalance: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="animate-fade-in-up text-xl font-bold text-slate-900 dark:text-slate-100">Odměny</h1>
      <RewardsShop
        rewards={rewards}
        claims={claims}
        userBalance={freshUser?.pointsBalance ?? user?.pointsBalance ?? 0}
        userName={user?.name ?? ""}
      />
    </div>
  );
}
