import { auth } from "@/lib/auth";
import { User } from "lucide-react";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Profil</h1>

      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white">
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2) ?? <User className="h-7 w-7" />}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <InfoRow label="Role" value={roleLabel(user?.role)} />
          <InfoRow label="Body" value={String(user?.pointsBalance ?? 0)} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? "—"}</span>
    </div>
  );
}

function roleLabel(role?: string) {
  switch (role) {
    case "ADMIN": return "Administrátor";
    case "MANAGER": return "Vedoucí";
    case "EMPLOYEE": return "Zaměstnanec";
    default: return "—";
  }
}
