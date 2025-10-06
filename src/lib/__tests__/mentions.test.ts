jest.mock('marked', () => ({
  marked: {
    parse: jest.fn(() => '<p><a href="user://123">@Alex Morgan</a></p>'),
    setOptions: jest.fn(),
  },
}));

jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (html: string) => html,
    addHook: jest.fn(),
  },
}));

import { extractMentionIds, insertMentionToken } from '@/lib/mentions';
import { markdownToHtml } from '@/lib/markdown';

describe('mention helpers', () => {
  it('extracts unique mention ids from markdown tokens', () => {
    const markdown = 'Hello [@Alex](user://123) and [@Jamie](user://456) and [@Alex](user://123)!';
    expect(extractMentionIds(markdown)).toEqual(['123', '456']);
  });

  it('inserts a mention token at the caret position', () => {
    const state = {
      value: 'Thanks @Al',
      selectionStart: 10,
      selectionEnd: 10,
    };

    const result = insertMentionToken({ id: '123', name: 'Alex Morgan' }, state);

    expect(result.value).toBe('Thanks [@Alex Morgan](user://123) ');
    expect(result.selection).toBe(result.value.length);
  });

  it('transforms mention links into mention pills', () => {
    const html = markdownToHtml('Ping [@Alex Morgan](user://123) for updates.');

    expect(html).toContain('href="/people/123"');
    expect(html).toContain('class="mention-pill"');
    expect(html).toContain('@Alex Morgan');
  });
});
