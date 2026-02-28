import { PermissionGate } from "@/components/layout/permission-gate";
import { Card } from "@/components/ui/card";

export default function RoleBAccessPage() {
  return (
    <PermissionGate resource="examples" action="view_b" fallback={<p>Role B access only.</p>}>
      <Card>
        <h2 className="text-xl font-semibold">Role B Area</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Example protected route for users with <code>examples:view_b</code>.
        </p>
      </Card>
    </PermissionGate>
  );
}
