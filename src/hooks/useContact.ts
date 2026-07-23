import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  addBring,
  addHomework,
  copyYesterdayContact,
  deleteBring,
  deleteHomework,
  getHomeworkCompletion,
  listBring,
  listHomework,
  todayIso,
  toggleHomeworkDone,
} from '@/services/contact';

export function useHomework(classId: string | undefined, date: string = todayIso(), studentId?: string) {
  return useQuery({
    queryKey: queryKeys.contact.homework(classId ?? '', date, studentId),
    queryFn: () => listHomework(classId as string, date, studentId),
    enabled: Boolean(classId),
  });
}

export function useBring(classId: string | undefined, date: string = todayIso()) {
  return useQuery({
    queryKey: queryKeys.contact.bring(classId ?? '', date),
    queryFn: () => listBring(classId as string, date),
    enabled: Boolean(classId),
  });
}

export function useHomeworkCompletion(classId: string | undefined, date: string = todayIso()) {
  return useQuery({
    queryKey: queryKeys.contact.completion(classId ?? '', date),
    queryFn: () => getHomeworkCompletion(classId as string, date),
    enabled: Boolean(classId),
  });
}

function invalidateContact(qc: ReturnType<typeof useQueryClient>, classId: string, date: string) {
  qc.invalidateQueries({ queryKey: queryKeys.contact.homework(classId, date) });
  qc.invalidateQueries({ queryKey: queryKeys.contact.bring(classId, date) });
  qc.invalidateQueries({ queryKey: queryKeys.contact.completion(classId, date) });
}

export function useAddHomework(classId: string | undefined, date: string = todayIso()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; note?: string }) =>
      addHomework({ classId: classId as string, dueDate: date, ...input }),
    onSuccess: () => {
      if (classId) invalidateContact(qc, classId, date);
    },
  });
}

export function useAddBring(classId: string | undefined, date: string = todayIso()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; note?: string }) =>
      addBring({ classId: classId as string, dueDate: date, ...input }),
    onSuccess: () => {
      if (classId) invalidateContact(qc, classId, date);
    },
  });
}

export function useDeleteHomework(classId: string | undefined, date: string = todayIso()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHomework(id),
    onSuccess: () => {
      if (classId) invalidateContact(qc, classId, date);
    },
  });
}

export function useDeleteBring(classId: string | undefined, date: string = todayIso()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBring(id),
    onSuccess: () => {
      if (classId) invalidateContact(qc, classId, date);
    },
  });
}

export function useCopyYesterday(classId: string | undefined, date: string = todayIso()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => copyYesterdayContact(classId as string, date),
    onSuccess: () => {
      if (classId) invalidateContact(qc, classId, date);
    },
  });
}

export function useToggleHomeworkDone(classId: string | undefined, date: string = todayIso()) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { homeworkId: string; studentId: string; done: boolean }) =>
      toggleHomeworkDone(input.homeworkId, input.studentId, input.done),
    onSuccess: (_d, vars) => {
      if (!classId) return;
      qc.invalidateQueries({
        queryKey: queryKeys.contact.homework(classId, date, vars.studentId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.contact.completion(classId, date) });
    },
  });
}
