
import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  userInteractions: number;
}

interface VitalMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    userInteractions: 0
  });

  const [vitals, setVitals] = useState<VitalMetrics>({
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0
  });

  useEffect(() => {
    // Measure page load performance
    const measureLoadTime = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        setMetrics(prev => ({ ...prev, loadTime }));
      }
    };

    // Measure render performance
    const measureRenderTime = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            setMetrics(prev => ({ ...prev, renderTime: entry.duration }));
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });
    };

    // Measure memory usage (if available)
    const measureMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }));
      }
    };

    // Measure Core Web Vitals
    const measureVitals = () => {
      // First Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            setVitals(prev => ({ ...prev, fcp: entry.startTime }));
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            setVitals(prev => ({ ...prev, fid }));
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    };

    measureLoadTime();
    measureRenderTime();
    measureMemoryUsage();
    measureVitals();

    // Set up periodic monitoring
    const interval = setInterval(() => {
      measureMemoryUsage();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const reportMetrics = () => {
    // Send metrics to analytics service
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics,
        vitals,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(console.error);
  };

  return {
    metrics,
    vitals,
    reportMetrics
  };
}
