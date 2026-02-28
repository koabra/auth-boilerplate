import { PermissionGate } from "@/components/layout/permission-gate";
import { Card } from "@/components/ui/card";

export default function RoleAAccessPage() {
  return (
    <PermissionGate resource="examples" action="view_a" fallback={<p>Role A access only.</p>}>
      <Card>
        <h2 className="text-xl font-semibold">Role A Area</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Example protected route for users with <code>examples:view_a</code>.
        </p>
      </Card>
    </PermissionGate>
  );
}
