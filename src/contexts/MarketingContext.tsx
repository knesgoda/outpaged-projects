import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  workflow_state: 'draft' | 'review' | 'approved' | 'scheduled' | 'live' | 'completed';
  target_launch_date?: string;
  actual_launch_date?: string;
  approval_metadata?: any;
  linked_assets?: string[];
  metrics?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface MarketingContextType {
  campaigns: Campaign[];
  createCampaign: (data: Partial<Campaign>) => Promise<Campaign | null>;
  updateCampaign: (id: string, data: Partial<Campaign>) => Promise<void>;
  requestApproval: (campaignId: string) => Promise<void>;
  approveCampaign: (campaignId: string, approverRole: string) => Promise<void>;
  scheduleCampaign: (campaignId: string, launchDate: string) => Promise<void>;
  linkAsset: (campaignId: string, assetId: string) => Promise<void>;
  updateMetrics: (campaignId: string, metrics: any) => Promise<void>;
  loading: boolean;
  refetch: () => Promise<void>;
}

const MarketingContext = createContext<MarketingContextType | undefined>(undefined);

export function MarketingProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching campaigns',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const createCampaign = async (data: Partial<Campaign>) => {
    try {
      const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .insert([{ ...data, workflow_state: 'draft' }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Campaign created',
        description: 'Marketing campaign created successfully',
      });

      await fetchCampaigns();
      return campaign;
    } catch (error: any) {
      toast({
        title: 'Error creating campaign',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCampaign = async (id: string, data: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Campaign updated',
        description: 'Campaign updated successfully',
      });

      await fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error updating campaign',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const requestApproval = async (campaignId: string) => {
    await updateCampaign(campaignId, { workflow_state: 'review' });
  };

  const approveCampaign = async (campaignId: string, approverRole: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const approvalMetadata = campaign.approval_metadata || {};
    approvalMetadata[approverRole] = {
      approved: true,
      timestamp: new Date().toISOString(),
    };

    await updateCampaign(campaignId, {
      workflow_state: 'approved',
      approval_metadata: approvalMetadata,
    });
  };

  const scheduleCampaign = async (campaignId: string, launchDate: string) => {
    await updateCampaign(campaignId, {
      workflow_state: 'scheduled',
      target_launch_date: launchDate,
    });
  };

  const linkAsset = async (campaignId: string, assetId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const linkedAssets = campaign.linked_assets || [];
    if (!linkedAssets.includes(assetId)) {
      linkedAssets.push(assetId);
      await updateCampaign(campaignId, { linked_assets: linkedAssets });
    }
  };

  const updateMetrics = async (campaignId: string, metrics: any) => {
    await updateCampaign(campaignId, { metrics });
  };

  return (
    <MarketingContext.Provider
      value={{
        campaigns,
        createCampaign,
        updateCampaign,
        requestApproval,
        approveCampaign,
        scheduleCampaign,
        linkAsset,
        updateMetrics,
        loading,
        refetch: fetchCampaigns,
      }}
    >
      {children}
    </MarketingContext.Provider>
  );
}

export function useMarketing() {
  const context = useContext(MarketingContext);
  if (!context) {
    throw new Error('useMarketing must be used within MarketingProvider');
  }
  return context;
}
