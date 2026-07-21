import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { listAnnouncements, listAnnouncementsWithStats } from '@/services/announcements';

// Example hook wiring a service to a query key (AGENTS.md §4 step 5). Parent side.
export function useAnnouncements(classId: string) {
  return useQuery({
    queryKey: queryKeys.announcements.list(classId),
    queryFn: () => listAnnouncements(classId),
    enabled: Boolean(classId),
  });
}

// Teacher side (carries read counts).
export function useAnnouncementsWithStats(classId: string) {
  return useQuery({
    queryKey: queryKeys.announcements.listWithStats(classId),
    queryFn: () => listAnnouncementsWithStats(classId),
    enabled: Boolean(classId),
  });
}
