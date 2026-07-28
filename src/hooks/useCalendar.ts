import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { addEvent, deleteEvent, listEvents } from '@/services/calendar';
import type { EventType } from '@/types/domain';

export function useEvents(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.calendar.events(classId ?? ''),
    queryFn: () => listEvents(classId as string),
    enabled: Boolean(classId),
  });
}

export function useAddEvent(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; eventDate: string; type: EventType }) =>
      addEvent({ classId: classId as string, ...input }),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.calendar.events(classId) });
    },
  });
}

export function useDeleteEvent(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.calendar.events(classId) });
    },
  });
}
