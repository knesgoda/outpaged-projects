import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/security';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function markdownToHtml(markdown: string): string {
  const raw = marked.parse(markdown ?? '', { async: false }) as string;
  const withMentions = transformMentionLinks(raw);
  return sanitizeHtml(withMentions);
}

function transformMentionLinks(html: string): string {
  return html.replace(/<a[^>]*href="user:\/\/([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, id, label) => {
    const safeLabel = label || `@user`;
    return `<a href="/people/${id}" class="mention-pill">${safeLabel}</a>`;
  });
}
