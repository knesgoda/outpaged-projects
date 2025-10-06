import { useEffect } from "react";
import { NotAuthorized as NotAuthorizedView } from "@/components/admin/NotAuthorized";

export default function NotAuthorizedPage() {
  useEffect(() => {
    document.title = "Access denied";
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <NotAuthorizedView />
    </div>
  );
}
