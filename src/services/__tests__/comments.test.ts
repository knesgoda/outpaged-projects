import { createComment, updateComment } from '@/services/comments';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

jest.mock('@/integrations/supabase/client', () => {
  const auth = { getUser: jest.fn() };
  const from = jest.fn();
  return { supabase: { auth, from } };
});

const { supabase } = require('@/integrations/supabase/client') as {
  supabase: {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };
};

describe('comments service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a comment with mention notifications', async () => {
    const insertedComment = {
      id: 'c1',
      entity_type: 'task',
      entity_id: 't1',
      author: 'u1',
      parent_id: null,
      body_markdown: 'Hello',
      body_html: '<p>Hello</p>',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      edited_at: null,
      author_profile: {
        user_id: 'u1',
        full_name: 'Alex Sender',
        avatar_url: null,
        email: 'alex@example.com',
      },
    };

    const commentInsertSingle = jest.fn().mockResolvedValue({ data: insertedComment, error: null });
    const commentInsertSelect = jest.fn().mockReturnValue({ single: commentInsertSingle });
    const commentInsert = jest.fn().mockReturnValue({ select: commentInsertSelect });

    const mentionInsertOnConflict = jest.fn().mockResolvedValue({ error: null });
    const mentionInsert = jest.fn().mockReturnValue({ onConflict: mentionInsertOnConflict });

    const notificationInsert = jest.fn().mockResolvedValue({ error: null });

    const profileMaybeSingle = jest.fn().mockResolvedValue({ data: { full_name: 'Alex Sender' }, error: null } as PostgrestSingleResponse<any>);
    const profileEq = jest.fn().mockReturnValue({ maybeSingle: profileMaybeSingle });
    const profileSelect = jest.fn().mockReturnValue({ eq: profileEq });

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    supabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'comments':
          return { insert: commentInsert };
        case 'comment_mentions':
          return { insert: mentionInsert };
        case 'notifications':
          return { insert: notificationInsert };
        case 'profiles':
          return { select: profileSelect };
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    });

    const result = await createComment({
      entity_type: 'task',
      entity_id: 't1',
      body_markdown: 'Hello [@Jamie](user://u2)',
      body_html: '<p>Hello</p>',
      mentions: ['u2', 'u2'],
    });

    expect(commentInsert).toHaveBeenCalled();
    expect(mentionInsert).toHaveBeenCalledWith([{ comment_id: 'c1', mentioned_user: 'u2' }]);
    expect(notificationInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'u2',
        type: 'mention',
        entity_type: 'task',
        entity_id: 't1',
      }),
    ]);
    expect(result.mentions).toEqual(['u2']);
  });

  it('updates comment mentions by diffing existing and new ids', async () => {
    const updateSingle = jest.fn().mockResolvedValue({ data: {
      id: 'c1',
      entity_type: 'task',
      entity_id: 't1',
      author: 'u1',
      parent_id: null,
      body_markdown: 'Updated',
      body_html: '<p>Updated</p>',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
      edited_at: '2024-01-02T00:00:00.000Z',
      author_profile: { user_id: 'u1', full_name: 'Alex Sender', avatar_url: null, email: 'alex@example.com' },
    }, error: null });
    const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
    const updateEq = jest.fn().mockReturnValue({ select: updateSelect });
    const updateCall = jest.fn().mockReturnValue({ eq: updateEq });

    const existingMentions = jest.fn().mockResolvedValue({ data: [{ mentioned_user: 'u2' }], error: null });
    const mentionDelete = jest.fn().mockResolvedValue({ error: null });
    const mentionInsertOnConflict = jest.fn().mockResolvedValue({ error: null });
    const mentionInsert = jest.fn().mockReturnValue({ onConflict: mentionInsertOnConflict });

    const profileMaybeSingle = jest.fn().mockResolvedValue({ data: { full_name: 'Alex Sender' }, error: null } as PostgrestSingleResponse<any>);
    const profileEq = jest.fn().mockReturnValue({ maybeSingle: profileMaybeSingle });
    const profileSelect = jest.fn().mockReturnValue({ eq: profileEq });

    supabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'comments':
          return {
            select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'c1', author: 'u1', entity_type: 'task', entity_id: 't1' }, error: null }) }) }),
            update: updateCall,
          };
        case 'comment_mentions':
          return {
            select: () => ({ eq: () => existingMentions() }),
            insert: mentionInsert,
            delete: () => ({ eq: () => ({ in: () => mentionDelete() }) }),
          };
        case 'notifications':
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        case 'profiles':
          return { select: profileSelect };
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    });

    const result = await updateComment('c1', {
      body_markdown: 'Updated [@Taylor](user://u3)',
      body_html: '<p>Updated</p>',
      mentions: ['u3'],
    });

    expect(mentionDelete).toHaveBeenCalled();
    expect(mentionInsert).toHaveBeenCalledWith([{ comment_id: 'c1', mentioned_user: 'u3' }]);
    expect(result.mentions).toEqual(['u3']);
  });
});
