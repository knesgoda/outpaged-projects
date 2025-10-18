import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMarketing } from '@/contexts/MarketingContext';
import { Clock, CheckCircle, AlertCircle, Rocket } from 'lucide-react';

const workflowStates = {
  draft: { label: 'Draft', color: 'bg-muted', icon: Clock },
  review: { label: 'In Review', color: 'bg-warning', icon: AlertCircle },
  approved: { label: 'Approved', color: 'bg-success', icon: CheckCircle },
  scheduled: { label: 'Scheduled', color: 'bg-info', icon: Clock },
  live: { label: 'Live', color: 'bg-primary', icon: Rocket },
  completed: { label: 'Completed', color: 'bg-muted', icon: CheckCircle },
};

export function CampaignWorkflowManager() {
  const { campaigns, requestApproval, approveCampaign, scheduleCampaign } = useMarketing();

  const handleRequestApproval = async (campaignId: string) => {
    await requestApproval(campaignId);
  };

  const handleApprove = async (campaignId: string) => {
    await approveCampaign(campaignId, 'marketing_lead');
  };

  const handleSchedule = async (campaignId: string) => {
    const date = prompt('Enter launch date (YYYY-MM-DD):');
    if (date) {
      await scheduleCampaign(campaignId, date);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Campaign Workflows</h2>
      
      {campaigns.map((campaign) => {
        const state = workflowStates[campaign.workflow_state];
        const StateIcon = state.icon;

        return (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{campaign.title}</CardTitle>
                <Badge className={state.color}>
                  <StateIcon className="w-3 h-3 mr-1" />
                  {state.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{campaign.description}</p>
              
              <div className="flex gap-2">
                {campaign.workflow_state === 'draft' && (
                  <Button size="sm" onClick={() => handleRequestApproval(campaign.id)}>
                    Request Approval
                  </Button>
                )}
                
                {campaign.workflow_state === 'review' && (
                  <Button size="sm" onClick={() => handleApprove(campaign.id)}>
                    Approve Campaign
                  </Button>
                )}
                
                {campaign.workflow_state === 'approved' && (
                  <Button size="sm" onClick={() => handleSchedule(campaign.id)}>
                    Schedule Launch
                  </Button>
                )}
              </div>

              {campaign.target_launch_date && (
                <p className="text-sm text-muted-foreground mt-2">
                  Target Launch: {new Date(campaign.target_launch_date).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
