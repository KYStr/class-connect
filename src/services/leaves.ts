import { supabase } from '@/lib/supabase';
import type { Leave, LeaveStatus, LeaveType } from '@/types/domain';
import { notifyProfiles } from '@/services/push';

// DEVELOPMENT.md §8.2 / §8.3 — online leave (SPEC L6).

type LeaveRow = {
  id: string;
  student_id: string;
  leave_date: string;
  type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  students?: { seat: string; name: string } | null;
};

function toLeave(r: LeaveRow): Leave {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.students?.name,
    seat: r.students?.seat,
    leaveDate: r.leave_date,
    type: r.type,
    reason: r.reason,
    status: r.status,
  };
}

export async function listLeavesForParent(studentId: string): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('id, student_id, leave_date, type, reason, status, students(seat, name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as LeaveRow[]).map(toLeave);
}

export async function listPendingLeaves(classId: string): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('id, student_id, leave_date, type, reason, status, students(seat, name)')
    .eq('class_id', classId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LeaveRow[]).map(toLeave);
}

export async function listLeavesForClass(classId: string): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('id, student_id, leave_date, type, reason, status, students(seat, name)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as LeaveRow[]).map(toLeave);
}

export async function submitLeave(input: {
  studentId: string;
  leaveDate: string;
  type: LeaveType;
  reason: string;
}): Promise<Leave> {
  const { data: userData } = await supabase.auth.getUser();
  const parentId = userData.user?.id;
  if (!parentId) throw new Error('Not authenticated');

  const { data: student, error: stErr } = await supabase
    .from('students')
    .select('id, class_id')
    .eq('id', input.studentId)
    .single();
  if (stErr) throw stErr;
  if (!student) throw new Error('Student not found');

  const { data, error } = await supabase
    .from('leaves')
    .insert({
      class_id: student.class_id as string,
      student_id: input.studentId,
      parent_id: parentId,
      leave_date: input.leaveDate,
      type: input.type,
      reason: input.reason || null,
      status: 'pending',
    })
    .select('id, student_id, leave_date, type, reason, status, students(seat, name)')
    .single();
  if (error) throw error;
  return toLeave(data as LeaveRow);
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  sick: '病假',
  personal: '事假',
  late: '遲到',
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: '待審核',
  approved: '已核准',
  rejected: '未核准',
};

export async function reviewLeave(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const reviewerId = userData.user?.id;
  if (!reviewerId) throw new Error('Not authenticated');

  const { data: before, error: bErr } = await supabase
    .from('leaves')
    .select('parent_id, type, leave_date')
    .eq('id', id)
    .single();
  if (bErr) throw bErr;

  const { error } = await supabase
    .from('leaves')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  const parentId = before?.parent_id as string | undefined;
  if (parentId) {
    const label = status === 'approved' ? '已核准' : '未核准';
    void notifyProfiles({
      profileIds: [parentId],
      title: `🤒 請假${label}`,
      body: `${LEAVE_TYPE_LABEL[before.type as LeaveType] ?? '請假'} · ${before.leave_date as string}`,
      url: '/p',
    }).catch(() => undefined);
  }
}
