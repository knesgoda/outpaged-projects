import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Key, Clock, AlertCircle } from 'lucide-react';

export function SecurityPolicyManager() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState({
    twoFactorRequired: true,
    passwordExpiry: 90,
    sessionTimeout: 30,
    ipWhitelisting: false,
    auditLogRetention: 365,
    dataEncryption: true,
    ssoRequired: false,
  });

  const handleUpdatePolicy = (key: string, value: any) => {
    setPolicies((prev) => ({ ...prev, [key]: value }));
    toast({
      title: 'Policy Updated',
      description: 'Security policy has been updated successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Policies</h2>
        <p className="text-muted-foreground">Configure organization-wide security policies</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require 2FA for all users
                </p>
              </div>
              <Switch
                checked={policies.twoFactorRequired}
                onCheckedChange={(checked) =>
                  handleUpdatePolicy('twoFactorRequired', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Single Sign-On Required</Label>
                <p className="text-sm text-muted-foreground">
                  Force SSO for all authentication
                </p>
              </div>
              <Switch
                checked={policies.ssoRequired}
                onCheckedChange={(checked) =>
                  handleUpdatePolicy('ssoRequired', checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Password Expiry (days)</Label>
              <Input
                type="number"
                value={policies.passwordExpiry}
                onChange={(e) =>
                  handleUpdatePolicy('passwordExpiry', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Users will be required to change passwords after this period
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Session Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={policies.sessionTimeout}
                onChange={(e) =>
                  handleUpdatePolicy('sessionTimeout', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Inactive sessions will expire after this period
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Encryption at Rest</Label>
                <p className="text-sm text-muted-foreground">
                  Encrypt all data in database
                </p>
              </div>
              <Switch
                checked={policies.dataEncryption}
                onCheckedChange={(checked) =>
                  handleUpdatePolicy('dataEncryption', checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Audit Log Retention (days)</Label>
              <Input
                type="number"
                value={policies.auditLogRetention}
                onChange={(e) =>
                  handleUpdatePolicy('auditLogRetention', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Audit logs older than this will be archived
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>IP Whitelisting</Label>
                <p className="text-sm text-muted-foreground">
                  Restrict access to specific IP ranges
                </p>
              </div>
              <Switch
                checked={policies.ipWhitelisting}
                onCheckedChange={(checked) =>
                  handleUpdatePolicy('ipWhitelisting', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button>Save All Policies</Button>
      </div>
    </div>
  );
}
