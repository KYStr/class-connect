import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getMyChildren } from '@/services/students';

// Parent: the linked children (RLS guarantees only own). AGENTS.md §4 step 5.
export function useMyChildren() {
  return useQuery({
    queryKey: queryKeys.students.mine(),
    queryFn: () => getMyChildren(),
  });
}
