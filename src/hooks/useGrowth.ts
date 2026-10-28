import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  addMilestone,
  addPerformanceNote,
  createPhoto,
  deletePhoto,
  getGrowthTimeline,
  getMemoryBookStats,
  listPhotos,
  listTodayPhotos,
} from '@/services/growth';
import type { Photo } from '@/types/domain';

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

export function useTodayPhotos(studentId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.growth.photos(studentId ?? ''), 'today'] as const,
    queryFn: () => listTodayPhotos(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useCreatePhoto(classId: string | undefined, studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentIds: string[]; caption: string; file: File }) =>
      createPhoto({ classId: classId as string, ...input }),
    onSuccess: (_data, input) => {
      const ids = new Set([studentId, ...input.studentIds].filter(Boolean) as string[]);
      for (const id of ids) {
        qc.invalidateQueries({ queryKey: queryKeys.growth.photos(id) });
        qc.invalidateQueries({ queryKey: queryKeys.growth.memoryBook(id) });
      }
    },
  });
}

export function useDeletePhoto(studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photo: Photo) => deletePhoto(photo),
    onSuccess: () => {
      if (!studentId) return;
      qc.invalidateQueries({ queryKey: queryKeys.growth.photos(studentId) });
      qc.invalidateQueries({ queryKey: queryKeys.growth.memoryBook(studentId) });
    },
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
