import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Clock, 
  Eye, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle 
} from "lucide-react";

interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    fcp: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    measurePerformance();
  }, []);

  const measurePerformance = () => {
    try {
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        setMetrics(prev => ({
          ...prev,
          ttfb: navigation.responseStart - navigation.requestStart,
        }));
      }

      // Observe LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        setMetrics(prev => ({ ...prev, lcp: lastEntry.renderTime || lastEntry.loadTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe CLS
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        setMetrics(prev => ({ ...prev, cls }));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Observe FCP
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      setLoading(false);
    } catch (error) {
      console.error('Error measuring performance:', error);
      setLoading(false);
    }
  };

  const getMetricStatus = (value: number, thresholds: { good: number; needsImprovement: number }) => {
    if (value <= thresholds.good) return { status: 'good', color: 'text-green-500' };
    if (value <= thresholds.needsImprovement) return { status: 'needs-improvement', color: 'text-yellow-500' };
    return { status: 'poor', color: 'text-red-500' };
  };

  const lcpStatus = getMetricStatus(metrics.lcp, { good: 2500, needsImprovement: 4000 });
  const fidStatus = getMetricStatus(metrics.fid, { good: 100, needsImprovement: 300 });
  const clsStatus = getMetricStatus(metrics.cls, { good: 0.1, needsImprovement: 0.25 });
  const fcpStatus = getMetricStatus(metrics.fcp, { good: 1800, needsImprovement: 3000 });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'needs-improvement':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      default:
        return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            Measuring performance...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Performance Monitor</h2>
        <p className="text-muted-foreground">
          Core Web Vitals and performance metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LCP</CardTitle>
            {getStatusIcon(lcpStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.lcp / 1000).toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground">Largest Contentful Paint</p>
            <Progress 
              value={(metrics.lcp / 4000) * 100} 
              className="mt-2" 
            />
            <p className={`text-xs mt-1 ${lcpStatus.color}`}>
              Target: &lt; 2.5s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FID</CardTitle>
            {getStatusIcon(fidStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.fid.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">First Input Delay</p>
            <Progress 
              value={(metrics.fid / 300) * 100} 
              className="mt-2" 
            />
            <p className={`text-xs mt-1 ${fidStatus.color}`}>
              Target: &lt; 100ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CLS</CardTitle>
            {getStatusIcon(clsStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cls.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">Cumulative Layout Shift</p>
            <Progress 
              value={(metrics.cls / 0.25) * 100} 
              className="mt-2" 
            />
            <p className={`text-xs mt-1 ${clsStatus.color}`}>
              Target: &lt; 0.1
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FCP</CardTitle>
            {getStatusIcon(fcpStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.fcp / 1000).toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground">First Contentful Paint</p>
            <Progress 
              value={(metrics.fcp / 3000) * 100} 
              className="mt-2" 
            />
            <p className={`text-xs mt-1 ${fcpStatus.color}`}>
              Target: &lt; 1.8s
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lcpStatus.status !== 'good' && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Improve LCP</p>
                  <p className="text-sm text-yellow-800">
                    Optimize images, use lazy loading, and implement code splitting to improve load times.
                  </p>
                </div>
              </div>
            )}
            
            {fidStatus.status !== 'good' && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Reduce FID</p>
                  <p className="text-sm text-yellow-800">
                    Break up long JavaScript tasks, use web workers, and minimize third-party scripts.
                  </p>
                </div>
              </div>
            )}
            
            {clsStatus.status !== 'good' && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Fix Layout Shifts</p>
                  <p className="text-sm text-yellow-800">
                    Add size attributes to images, reserve space for ads, and avoid inserting content above existing content.
                  </p>
                </div>
              </div>
            )}

            {lcpStatus.status === 'good' && fidStatus.status === 'good' && clsStatus.status === 'good' && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Great Performance!</p>
                  <p className="text-sm text-green-800">
                    All Core Web Vitals are in the good range. Keep monitoring and maintaining these metrics.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
