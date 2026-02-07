"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RequestForm from "@/components/hr/request-form";
import Link from "next/link";

export default function NewRequestPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/requests"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Nová žádost</h1>
      </div>

      {/* Form */}
      {done ? (
        <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 py-12 text-center">
          <p className="text-lg font-semibold text-emerald-700">
            ✅ Žádost odeslána
          </p>
          <p className="mt-1 text-sm text-emerald-600">
            Budete přesměrování na seznam žádostí…
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <RequestForm
            onSuccess={() => {
              setDone(true);
              setTimeout(() => router.push("/requests"), 1500);
            }}
          />
        </div>
      )}
    </div>
  );
}
