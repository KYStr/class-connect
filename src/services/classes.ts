import { supabase } from '@/lib/supabase';
import type { Class } from '@/types/domain';

type ClassRow = {
  id: string;
  name: string;
  office_hours: string | null;
  remind_day: string | null;
  remind_time: string | null;
};

function toClass(r: ClassRow): Class {
  const day = r.remind_day === 'prev' || r.remind_day === 'none' ? r.remind_day : 'same';
  return {
    id: r.id,
    name: r.name,
    officeHours: r.office_hours ?? '',
    remindDay: day,
    remindTime: r.remind_time || '07:00',
  };
}

// DEVELOPMENT.md §8.2. RLS scopes rows: teacher → own classes; parent → children's classes.
export async function getMyClasses(): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, office_hours, remind_day, remind_time');
  if (error) throw error;
  return ((data ?? []) as ClassRow[]).map(toClass);
}

export async function getClass(classId: string): Promise<Class | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, office_hours, remind_day, remind_time')
    .eq('id', classId)
    .maybeSingle();
  if (error) throw error;
  return data ? toClass(data as ClassRow) : null;
}

export async function createClass(input: {
  name: string;
  officeHours?: string;
}): Promise<Class> {
  const { data: userData } = await supabase.auth.getUser();
  const teacherId = userData.user?.id;
  if (!teacherId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('classes')
    .insert({
      teacher_id: teacherId,
      name: input.name,
      ...(input.officeHours ? { office_hours: input.officeHours } : {}),
    })
    .select('id, name, office_hours, remind_day, remind_time')
    .single();
  if (error) throw error;
  return toClass(data as ClassRow);
}

export async function updateClassReminder(
  classId: string,
  input: { remindDay: 'same' | 'prev' | 'none'; remindTime: string },
): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .update({ remind_day: input.remindDay, remind_time: input.remindTime })
    .eq('id', classId);
  if (error) throw error;
}
