import { Link, Outlet, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function TimeHomePage() {
  const location = useLocation();
  useDocumentTitle("Time");

  const tabValue = location.pathname.endsWith("/approvals") ? "approvals" : "my";

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
        <p className="text-sm text-muted-foreground">Track and approve work in one place.</p>
      </header>
      <Card>
        <CardContent className="p-6">
          <Tabs value={tabValue} onValueChange={() => {}} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-auto">
              <TabsTrigger value="my" asChild>
                <Link to="/time/my">My</Link>
              </TabsTrigger>
              <TabsTrigger value="approvals" asChild>
                <Link to="/time/approvals">Approvals</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-6">
            <Outlet />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
