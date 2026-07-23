import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listAnnouncementsWithStats,
  markAnnouncementRead,
} from '@/services/announcements';

// Example hook wiring a service to a query key (AGENTS.md §4 step 5). Parent side.
export function useAnnouncements(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.list(classId ?? ''),
    queryFn: () => listAnnouncements(classId as string),
    enabled: Boolean(classId),
  });
}

// Teacher side (carries read counts).
export function useAnnouncementsWithStats(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.listWithStats(classId ?? ''),
    queryFn: () => listAnnouncementsWithStats(classId as string),
    enabled: Boolean(classId),
  });
}

export function useCreateAnnouncement(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body: string; important: boolean }) =>
      createAnnouncement({ classId: classId as string, ...input }),
    onSuccess: () => {
      if (!classId) return;
      qc.invalidateQueries({ queryKey: queryKeys.announcements.listWithStats(classId) });
      qc.invalidateQueries({ queryKey: queryKeys.announcements.list(classId) });
    },
  });
}

export function useDeleteAnnouncement(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      if (!classId) return;
      qc.invalidateQueries({ queryKey: queryKeys.announcements.listWithStats(classId) });
      qc.invalidateQueries({ queryKey: queryKeys.announcements.list(classId) });
    },
  });
}

export function useMarkAnnouncementRead(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markAnnouncementRead(id),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.announcements.list(classId) });
    },
  });
}
