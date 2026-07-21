import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getMyClasses } from '@/services/classes';
import { getRoster } from '@/services/students';

export function useMyClasses() {
  return useQuery({
    queryKey: queryKeys.classes.mine(),
    queryFn: () => getMyClasses(),
  });
}

export function useRoster(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.students.roster(classId ?? ''),
    queryFn: () => getRoster(classId as string),
    enabled: Boolean(classId),
  });
}
