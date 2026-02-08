import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      phone: true,
      avatarUrl: true,
      pointsBalance: true,
      hireDate: true,
      department: { select: { name: true } },
    },
  });

  if (!user) return null;

  return <ProfileClient user={user} />;
}
