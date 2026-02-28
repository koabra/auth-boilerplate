import { PermissionGate } from "@/components/layout/permission-gate";
import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
  return (
    <PermissionGate resource="profile" action="manage" fallback={<p>Not allowed.</p>}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Profile Management</h2>
        <ProfileForm />
      </div>
    </PermissionGate>
  );
}
