import React from 'react';
import { sanitizeHtml } from '@/lib/security';

interface SafeHtmlProps {
  html: string;
  allowedTags?: string[];
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * SafeHtml component that sanitizes HTML content before rendering
 * This prevents XSS attacks by cleaning potentially dangerous HTML
 */
export function SafeHtml({ 
  html, 
  allowedTags, 
  className, 
  as: Component = 'div' 
}: SafeHtmlProps) {
  const sanitizedHtml = sanitizeHtml(html, allowedTags);
  
  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

/**
 * Hook to safely sanitize HTML content
 */
export function useSafeHtml(html: string, allowedTags?: string[]) {
  return React.useMemo(() => sanitizeHtml(html, allowedTags), [html, allowedTags]);
}