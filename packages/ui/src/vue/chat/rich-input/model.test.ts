import { expect, it } from 'vitest';
import { findChatInputQuery, insertChatInputToken, rebaseChatInputTokens } from './model';

it('finds @ and / only at a live caret outside resolved tokens', () => {
  expect(findChatInputQuery('请看 @pla', 7, [])).toEqual({ kind: 'mention', search: 'pla', from: 3, to: 7 });
  expect(findChatInputQuery('/search', 7, [])?.kind).toBe('command');
  expect(findChatInputQuery('email@example.com', 17, [])).toBeNull();
  expect(findChatInputQuery('请看 @plan', 8, [{ id: '1', key: 'plan', kind: 'mention', from: 3, to: 8, text: '@plan' }])).toBeNull();
});

it('rebases unaffected references, invalidates touched references and inserts one occurrence', () => {
  const first = { id: 'a', key: 'file-a', kind: 'mention' as const, from: 0, to: 2, text: '@A' };
  expect(rebaseChatInputTokens('@A hi', '@A xhi', [first])).toEqual([first]);
  expect(rebaseChatInputTokens('@A hi', 'x@A hi', [first])).toEqual([{ ...first, from: 1, to: 3 }]);
  expect(rebaseChatInputTokens('@A hi', '@B hi', [first])).toEqual([]);
  const repeated = { ...first, id: 'b', from: 3, to: 5 };
  expect(rebaseChatInputTokens('@A @A', '@A x@A', [first, repeated], { from: 3, to: 3 }))
    .toEqual([first, { ...repeated, from: 4, to: 6 }]);
  const inserted = insertChatInputToken('@A hi /se', [first], { kind: 'command', search: 'se', from: 6, to: 9 }, 'search', 'search', 'b');
  expect(inserted.text).toBe('@A hi /search ');
  expect(inserted.tokens).toEqual([first, { id: 'b', key: 'search', kind: 'command', from: 6, to: 13, text: '/search' }]);
  expect(inserted.caret).toBe(14);
});
