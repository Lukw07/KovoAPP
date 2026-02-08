import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmployeeList } from "@/actions/employee-management";
import { EmployeeTable } from "@/components/admin/employee-table";

export const metadata = { title: "Správa zaměstnanců" };

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const employees = await getEmployeeList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
          Správa zaměstnanců
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Přehled zaměstnanců, smluv, prohlídek a docházky
        </p>
      </div>

      <EmployeeTable employees={employees} />
    </div>
  );
}
