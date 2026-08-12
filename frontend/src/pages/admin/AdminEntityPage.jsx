import { useParams } from "react-router-dom";
import { EntityManager } from "@/components/admin/EntityManager";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { NotFoundState } from "@/components/common/StateViews";
import { ADMIN_ENTITIES } from "@/constants/adminEntities";
import { useSeo } from "@/hooks/useSeo";

export default function AdminEntityPage() {
  const { entity } = useParams();
  const config = ADMIN_ENTITIES[entity];

  useSeo({
    title: `${config?.label || "Admin"} — CG STUDENT PORTAL`,
    path: `/admin/${entity}`,
  });

  if (!config) {
    return (
      <AdminLayout title="Not found">
        <NotFoundState />
      </AdminLayout>
    );
  }

  return <EntityManager key={entity} entity={entity} />;
}
