import { getActiveJobs } from "@/actions/job-queries";
import { JobList } from "@/components/jobs/job-card";
import type { JobData } from "@/components/jobs/job-card";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Volné pozice" };

export default async function JobsPage() {
  const jobs = await getActiveJobs();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
          <Briefcase className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Volné pozice</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Doporučte známého a získejte body
          </p>
        </div>
      </div>

      <JobList jobs={jobs as unknown as JobData[]} />
    </div>
  );
}
