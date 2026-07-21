import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/queryKeys';

// Sanity contract test for the query-key factory (AGENTS.md rail 5).
describe('queryKeys', () => {
  it('builds stable, scoped keys', () => {
    expect(queryKeys.announcements.list('c1')).toEqual(['announcements', 'c1']);
    expect(queryKeys.grades.myScore('e1', 's1')).toEqual(['grades', 'score', 'e1', 's1']);
    expect(queryKeys.messages.list('conv1')).toEqual(['messages', 'list', 'conv1']);
  });
});
