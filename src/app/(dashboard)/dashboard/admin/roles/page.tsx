import { PermissionGate } from "@/components/layout/permission-gate";
import { RoleEditor } from "@/components/admin/role-editor";

export default function AdminRolesPage() {
  return (
    <PermissionGate resource="roles" action="manage" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Role Management</h2>
        <RoleEditor />
      </div>
    </PermissionGate>
  );
}
