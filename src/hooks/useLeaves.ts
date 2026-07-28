import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  listLeavesForClass,
  listLeavesForParent,
  listPendingLeaves,
  reviewLeave,
  submitLeave,
} from '@/services/leaves';
import type { LeaveType } from '@/types/domain';

export function useParentLeaves(studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leaves.forParent(studentId ?? ''),
    queryFn: () => listLeavesForParent(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function usePendingLeaves(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leaves.pending(classId ?? ''),
    queryFn: () => listPendingLeaves(classId as string),
    enabled: Boolean(classId),
  });
}

export function useClassLeaves(classId: string | undefined) {
  return useQuery({
    queryKey: ['leaves', 'class', classId ?? ''] as const,
    queryFn: () => listLeavesForClass(classId as string),
    enabled: Boolean(classId),
  });
}

export function useSubmitLeave(studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { leaveDate: string; type: LeaveType; reason: string }) =>
      submitLeave({ studentId: studentId as string, ...input }),
    onSuccess: () => {
      if (studentId) qc.invalidateQueries({ queryKey: queryKeys.leaves.forParent(studentId) });
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useReviewLeave(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: 'approved' | 'rejected' }) =>
      reviewLeave(input.id, input.status),
    onSuccess: () => {
      if (classId) {
        qc.invalidateQueries({ queryKey: queryKeys.leaves.pending(classId) });
        qc.invalidateQueries({ queryKey: ['leaves', 'class', classId] });
      }
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}
