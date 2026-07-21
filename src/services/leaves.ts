import type { Leave, LeaveType } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function listLeavesForParent(_studentId: string): Promise<Leave[]> {
  return [];
}

export async function listPendingLeaves(_classId: string): Promise<Leave[]> {
  return [];
}

export async function submitLeave(_input: {
  studentId: string;
  leaveDate: string;
  type: LeaveType;
  reason: string;
}): Promise<Leave> {
  return notImplemented('submitLeave');
}

export async function reviewLeave(_id: string, _status: 'approved' | 'rejected'): Promise<void> {
  return notImplemented('reviewLeave');
}
