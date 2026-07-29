import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  addExamType,
  addSubject,
  archiveExam,
  deleteExam,
  deleteExamType,
  deleteSubject,
  getDistribution,
  getExamRoster,
  getMyChildScore,
  getPercentile,
  listExamTypes,
  listExams,
  listSubjects,
  setScore,
  unarchiveExam,
  upsertExam,
} from '@/services/grades';

export function useExams(classId: string | undefined, archived = false) {
  return useQuery({
    queryKey: [...queryKeys.grades.exams(classId ?? ''), archived ? 'archived' : 'active'] as const,
    queryFn: () => listExams(classId as string, { archived }),
    enabled: Boolean(classId),
  });
}

export function useSubjects(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.subjects(classId ?? ''),
    queryFn: () => listSubjects(classId as string),
    enabled: Boolean(classId),
  });
}

export function useExamTypes(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grades.examTypes(classId ?? ''),
    queryFn: () => listExamTypes(classId as string),
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
      subjectId?: string | null;
      examTypeId?: string | null;
    }) => upsertExam({ classId: classId as string, ...input }),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
    },
  });
}

export function useAddSubject(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => addSubject(classId as string, name),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.grades.subjects(classId) });
    },
  });
}

export function useAddExamType(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => addExamType(classId as string, name),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.grades.examTypes(classId) });
    },
  });
}

export function useDeleteSubject(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      if (classId) {
        qc.invalidateQueries({ queryKey: queryKeys.grades.subjects(classId) });
        qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
      }
    },
  });
}

export function useDeleteExamType(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExamType(id),
    onSuccess: () => {
      if (classId) {
        qc.invalidateQueries({ queryKey: queryKeys.grades.examTypes(classId) });
        qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
      }
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

function invalidateExamLists(qc: ReturnType<typeof useQueryClient>, classId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
}

export function useArchiveExam(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveExam(id),
    onSuccess: () => {
      if (classId) invalidateExamLists(qc, classId);
    },
  });
}

export function useUnarchiveExam(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unarchiveExam(id),
    onSuccess: () => {
      if (classId) invalidateExamLists(qc, classId);
    },
  });
}

export function useDeleteExam(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExam(id),
    onSuccess: () => {
      if (classId) invalidateExamLists(qc, classId);
    },
  });
}
