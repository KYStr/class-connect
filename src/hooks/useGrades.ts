import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  deleteExam,
  getDistribution,
  getExamRoster,
  getMyChildScore,
  getPercentile,
  listExams,
  setScore,
  upsertExam,
} from '@/services/grades';

export function useExams(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.exams(classId ?? ''),
    queryFn: () => listExams(classId as string),
    enabled: Boolean(classId),
  });
}

export function useMyChildScore(examId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.myScore(examId ?? '', studentId ?? ''),
    queryFn: () => getMyChildScore(examId as string, studentId as string),
    enabled: Boolean(examId && studentId),
  });
}

export function useDistribution(examId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.distribution(examId ?? ''),
    queryFn: () => getDistribution(examId as string),
    enabled: Boolean(examId),
  });
}

export function usePercentile(examId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: ['grades', 'percentile', examId ?? '', studentId ?? ''] as const,
    queryFn: () => getPercentile(examId as string, studentId as string),
    enabled: Boolean(examId && studentId),
  });
}

export function useExamRoster(examId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.examRoster(examId ?? ''),
    queryFn: () => getExamRoster(examId as string),
    enabled: Boolean(examId),
  });
}

export function useUpsertExam(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id?: string;
      name: string;
      published: boolean;
      showDist: boolean;
    }) => upsertExam({ classId: classId as string, ...input }),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
    },
  });
}

export function useSetScore(examId: string | undefined, classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; score: number | null }) =>
      setScore(examId as string, input.studentId, input.score),
    onSuccess: () => {
      if (examId) {
        qc.invalidateQueries({ queryKey: queryKeys.grades.examRoster(examId) });
        qc.invalidateQueries({ queryKey: queryKeys.grades.distribution(examId) });
      }
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
    },
  });
}

export function useDeleteExam(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExam(id),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
    },
  });
}
