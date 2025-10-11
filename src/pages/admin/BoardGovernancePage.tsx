import { BoardGovernanceAdmin } from "@/components/admin/BoardGovernanceAdmin";

export default function BoardGovernancePage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Board governance</h2>
        <p className="text-muted-foreground">
          Configure default templates, field guardrails, taxonomy, lifecycle, and review the audit trail.
        </p>
      </div>
      <BoardGovernanceAdmin />
    </section>
  );
}
