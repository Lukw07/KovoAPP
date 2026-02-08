import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getEmployeeDetail } from "@/actions/employee-management";
import { EmployeeDetail } from "@/components/admin/employee-detail";

export const metadata = { title: "Detail zaměstnance" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  const { id } = await params;

  let employee;
  try {
    employee = await getEmployeeDetail(id);
  } catch {
    notFound();
  }

  return <EmployeeDetail employee={employee} />;
}
