import { Settings } from "lucide-react";

export const metadata = { title: "Nastavení" };

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nastavení</h1>
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
        <Settings className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nastavení aplikace</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Připravujeme...</p>
      </div>
    </div>
  );
}
