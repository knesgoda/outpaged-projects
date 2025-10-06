import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceMembers, useWorkspaceSettings } from "@/hooks/useWorkspace";
import { KeyValue } from "@/components/admin/KeyValue";

type BillingDetails = {
  plan?: string;
  seats_included?: number;
  renewal_date?: string;
  currency?: string;
  amount_due?: number;
  payment_method?: {
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
  };
};

function formatCurrency(amount: number | undefined, currency: string | undefined) {
  if (amount === undefined || currency === undefined) {
    return "";
  }
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function BillingPage() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const { data: members = [] } = useWorkspaceMembers();

  const billing =
    settings?.billing && typeof settings.billing === "object"
      ? (settings.billing as BillingDetails)
      : undefined;

  const seatsIncluded = billing?.seats_included ?? members.length;
  const renewalDate = billing?.renewal_date ? new Date(billing.renewal_date).toLocaleDateString() : "Not scheduled";
  const amountDue = formatCurrency(billing?.amount_due, billing?.currency);

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-muted-foreground">Review your subscription details and current payment method.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Plan summary</CardTitle>
          <CardDescription>Your workspace inherits these limits and renewal terms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading plan details...</p>
          ) : (
            <>
              <KeyValue label="Plan">{billing?.plan ?? "Not set"}</KeyValue>
              <KeyValue label="Seats included">{seatsIncluded}</KeyValue>
              <KeyValue label="Members in workspace">{members.length}</KeyValue>
              <KeyValue label="Next renewal">{renewalDate}</KeyValue>
              <KeyValue label="Upcoming charge">{amountDue || "None"}</KeyValue>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment method</CardTitle>
          <CardDescription>Update cards and invoices from the billing portal.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment method...</p>
          ) : billing?.payment_method ? (
            <div className="grid gap-4 md:grid-cols-2">
              <KeyValue label="Brand">{billing.payment_method.brand ?? "Unknown"}</KeyValue>
              <KeyValue label="Last four">{billing.payment_method.last4 ?? "None"}</KeyValue>
              <KeyValue label="Expires">
                {billing.payment_method.exp_month && billing.payment_method.exp_year
                  ? `${String(billing.payment_method.exp_month).padStart(2, "0")}/${billing.payment_method.exp_year}`
                  : "Unknown"}
              </KeyValue>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payment method on file.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Invoices are delivered to workspace owners and admins.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Need a copy of a past invoice? Contact support or export directly from the billing portal.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
