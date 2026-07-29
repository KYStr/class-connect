import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getMyClasses } from '@/services/classes';
import { countBoundStudents, getRoster } from '@/services/students';

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

export function useBoundStudentCount(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.students.boundCount(classId ?? ''),
    queryFn: () => countBoundStudents(classId as string),
    enabled: Boolean(classId),
    // While nobody has joined yet, poll so overview can tuck roster away after first bind.
    refetchInterval: (q) => (q.state.data === 0 ? 12_000 : false),
  });
}
