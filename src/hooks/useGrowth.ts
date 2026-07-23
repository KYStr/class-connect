import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  addMilestone,
  addPerformanceNote,
  getGrowthTimeline,
  getMemoryBookStats,
  listPhotos,
} from '@/services/growth';

export function useGrowthTimeline(studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.growth.timeline(studentId ?? ''),
    queryFn: () => getGrowthTimeline(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useMemoryBook(studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.growth.memoryBook(studentId ?? ''),
    queryFn: () => getMemoryBookStats(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function usePhotos(studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.growth.photos(studentId ?? ''),
    queryFn: () => listPhotos(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useAddNote(classId: string | undefined, studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { emoji: string; title: string; body: string }) =>
      addPerformanceNote({
        classId: classId as string,
        studentId: studentId as string,
        ...input,
      }),
    onSuccess: () => {
      if (studentId) {
        qc.invalidateQueries({ queryKey: queryKeys.growth.timeline(studentId) });
        qc.invalidateQueries({ queryKey: queryKeys.growth.memoryBook(studentId) });
      }
    },
  });
}

export function useAddMilestone(classId: string | undefined, studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { emoji: string; title: string; body: string; occurredOn: string }) =>
      addMilestone({
        classId: classId as string,
        studentId: studentId as string,
        ...input,
      }),
    onSuccess: () => {
      if (studentId) {
        qc.invalidateQueries({ queryKey: queryKeys.growth.timeline(studentId) });
        qc.invalidateQueries({ queryKey: queryKeys.growth.memoryBook(studentId) });
      }
    },
  });
}
