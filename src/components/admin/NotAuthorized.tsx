import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function NotAuthorized() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">You do not have access</h1>
        <p className="text-muted-foreground">
          This area is limited to workspace admins. If you believe this is a mistake, contact an owner.
        </p>
      </div>
      <Button onClick={() => navigate("/")}>Go back home</Button>
    </div>
  );
}
