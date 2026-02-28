import { UserTable } from "@/components/admin/user-table";
import { PermissionGate } from "@/components/layout/permission-gate";

export default function AdminUsersPage() {
  return (
    <PermissionGate resource="users" action="read" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">User Management</h2>
        <UserTable />
      </div>
    </PermissionGate>
  );
}
