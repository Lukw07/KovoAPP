"use client";

import { useState } from "react";
import { Newspaper, BarChart3, Briefcase } from "lucide-react";
import { CreatePostForm } from "@/components/admin/create-post-form";
import { CreatePollForm } from "@/components/admin/create-poll-form";
import { CreateJobForm } from "@/components/admin/create-job-form";
import { cn } from "@/lib/utils";

type AdminTab = "post" | "poll" | "job";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("post");

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "post",
      label: "Nový příspěvek",
      icon: <Newspaper className="h-4 w-4" />,
    },
    {
      key: "poll",
      label: "Nová anketa",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: "job",
      label: "Nový inzerát",
      icon: <Briefcase className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all active:scale-95",
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form content */}
      {activeTab === "post" && <CreatePostForm />}
      {activeTab === "poll" && <CreatePollForm />}
      {activeTab === "job" && <CreateJobForm />}
    </div>
  );
}
