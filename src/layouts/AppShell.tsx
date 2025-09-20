import { AppLayout } from "@/components/layout/AppLayout";
import AuthGate from "@/providers/AuthGate";

export default function AppShell() {
  return (
    <AuthGate>
      <AppLayout />
    </AuthGate>
  );
}
