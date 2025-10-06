import DOMPurify, { Config } from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @param allowedTags - Optional array of allowed HTML tags
 * @returns Clean, safe HTML string
 */
export function sanitizeHtml(dirty: string, allowedTags?: string[]): string {
  if (!dirty) return '';

  const config: Config = {
    ALLOWED_TAGS: allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
      'code', 'pre', 'a'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_CONTENTS: ['script', 'style'],
    FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  };

  // Add rel="noopener noreferrer" to external links
  DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    if ('target' in node && node.target === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return DOMPurify.sanitize(dirty, config) as string;
}

/**
 * Sanitizes plain text to prevent any HTML injection
 * @param text - The text to sanitize
 * @returns Escaped plain text
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes user input
 * @param input - The user input to validate
 * @param maxLength - Maximum allowed length
 * @returns Sanitized input or throws error if invalid
 */
export function validateAndSanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      throw new Error('Input contains potentially malicious content');
    }
  }

  return sanitizeText(input);
}

/**
 * Content Security Policy headers configuration
 */
export const cspHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

/**
 * Security headers for HTTP responses
 */
export const securityHeaders = {
  ...cspHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Check for common patterns
  const commonPatterns = [
    /(.)\1{2,}/,  // repeated characters
    /123456|654321|abcdef|fedcba/,  // sequential patterns
    /password|admin|user|login/i,  // common words
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns and is not secure');
      score = Math.max(0, score - 1);
      break;
    }
  }

  return {
    isValid: errors.length === 0 && score >= 4,
    errors,
    score
  };
}