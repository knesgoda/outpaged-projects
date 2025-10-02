import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';

export function ComplianceReports() {
  const { toast } = useToast();

  const reports = [
    {
      id: 'gdpr',
      name: 'GDPR Compliance Report',
      description: 'Data processing and privacy controls',
      status: 'compliant',
      lastGenerated: '2025-01-15',
    },
    {
      id: 'soc2',
      name: 'SOC 2 Type II Report',
      description: 'Security, availability, and confidentiality',
      status: 'compliant',
      lastGenerated: '2025-01-10',
    },
    {
      id: 'hipaa',
      name: 'HIPAA Compliance',
      description: 'Healthcare data protection',
      status: 'review',
      lastGenerated: '2025-01-05',
    },
    {
      id: 'iso27001',
      name: 'ISO 27001 Assessment',
      description: 'Information security management',
      status: 'compliant',
      lastGenerated: '2025-01-12',
    },
  ];

  const handleGenerateReport = (reportId: string) => {
    toast({
      title: 'Generating Report',
      description: 'Your compliance report is being generated.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance Reports</h2>
        <p className="text-muted-foreground">Generate and download compliance documentation</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.description}
                    </p>
                  </div>
                </div>
                {report.status === 'compliant' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Generated:</span>
                  <span className="font-medium">{report.lastGenerated}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`font-medium ${
                      report.status === 'compliant'
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }`}
                  >
                    {report.status === 'compliant' ? 'Compliant' : 'Needs Review'}
                  </span>
                </div>
                <Button
                  onClick={() => handleGenerateReport(report.id)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
