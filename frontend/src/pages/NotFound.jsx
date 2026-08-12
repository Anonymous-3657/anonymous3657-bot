import { AppShell } from "@/components/layout/AppShell";
import { NotFoundState } from "@/components/common/StateViews";
import { useSeo } from "@/hooks/useSeo";

export default function NotFound() {
  useSeo({ title: "Page not found — CG STUDENT PORTAL" });
  return (
    <AppShell>
      <div className="container-page py-28">
        <NotFoundState />
      </div>
    </AppShell>
  );
}
