import { PageTemplate } from "../PageTemplate";

export default function AdminApiPage() {
  return (
    <PageTemplate
      title="API Explorer"
      description="Test API calls, generate tokens, and monitor rate limits."
      featureFlag="apiExplorer"
    />
  );
}
