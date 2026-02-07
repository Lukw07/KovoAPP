import { Gift } from "lucide-react";

export const metadata = { title: "Odměny" };

export default function RewardsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Odměny</h1>
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
        <Gift className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Shop s odměnami</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Připravujeme...</p>
      </div>
    </div>
  );
}
