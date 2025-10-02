import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Play, FileText, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestSuite {
  name: string;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  duration: number;
}

export function TestingDashboard() {
  const { toast } = useToast();
  const [runningTests, setRunningTests] = useState(false);

  const unitTests: TestSuite = {
    name: 'Unit Tests',
    tests: 247,
    passed: 239,
    failed: 5,
    skipped: 3,
    coverage: 82,
    duration: 4.2,
  };

  const integrationTests: TestSuite = {
    name: 'Integration Tests',
    tests: 89,
    passed: 84,
    failed: 3,
    skipped: 2,
    coverage: 75,
    duration: 12.8,
  };

  const e2eTests: TestSuite = {
    name: 'E2E Tests',
    tests: 34,
    passed: 31,
    failed: 2,
    skipped: 1,
    coverage: 68,
    duration: 45.3,
  };

  const allTests = [unitTests, integrationTests, e2eTests];
  const totalTests = allTests.reduce((sum, suite) => sum + suite.tests, 0);
  const totalPassed = allTests.reduce((sum, suite) => sum + suite.passed, 0);
  const totalFailed = allTests.reduce((sum, suite) => sum + suite.failed, 0);
  const overallCoverage = Math.round(
    allTests.reduce((sum, suite) => sum + suite.coverage, 0) / allTests.length
  );

  const handleRunTests = () => {
    setRunningTests(true);
    toast({
      title: 'Running Tests',
      description: 'Test suite execution started...',
    });
    setTimeout(() => {
      setRunningTests(false);
      toast({
        title: 'Tests Complete',
        description: `${totalPassed} passed, ${totalFailed} failed`,
      });
    }, 3000);
  };

  const TestSuiteCard = ({ suite }: { suite: TestSuite }) => {
    const passRate = ((suite.passed / suite.tests) * 100).toFixed(1);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{suite.name}</span>
            <span
              className={`text-sm font-normal ${
                suite.failed === 0 ? 'text-green-500' : 'text-yellow-500'
              }`}
            >
              {passRate}% Pass Rate
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{suite.tests}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">
                {suite.passed}
              </div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">
                {suite.failed}
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-500">
                {suite.skipped}
              </div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Code Coverage</span>
              <span className="font-medium">{suite.coverage}%</span>
            </div>
            <Progress value={suite.coverage} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{suite.duration}s</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Testing Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor test coverage and quality metrics
          </p>
        </div>
        <Button onClick={handleRunTests} disabled={runningTests} className="gap-2">
          <Play className="w-4 h-4" />
          {runningTests ? 'Running...' : 'Run All Tests'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
            <p className="text-xs text-muted-foreground">
              Across all test suites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((totalPassed / totalTests) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPassed} / {totalTests} tests passing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCoverage}%</div>
            <p className="text-xs text-muted-foreground">
              Overall code coverage
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="unit">Unit Tests</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="e2e">E2E Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {allTests.map((suite) => (
              <TestSuiteCard key={suite.name} suite={suite} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="unit">
          <TestSuiteCard suite={unitTests} />
        </TabsContent>

        <TabsContent value="integration">
          <TestSuiteCard suite={integrationTests} />
        </TabsContent>

        <TabsContent value="e2e">
          <TestSuiteCard suite={e2eTests} />
        </TabsContent>
      </Tabs>

      {totalFailed > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="w-5 h-5" />
              Failed Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {totalFailed} tests are currently failing. Review and fix before
                deployment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
