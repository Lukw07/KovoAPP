import { ResponsiveLayout } from "@/components/layout/responsive-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ResponsiveLayout>{children}</ResponsiveLayout>;
}
