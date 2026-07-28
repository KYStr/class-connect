import { supabase } from '@/lib/supabase';
import type { ConsentForm, ConsentStatus, Student } from '@/types/domain';
import { notifyProfiles } from '@/services/push';

// DEVELOPMENT.md §8.2 / §8.3 — consent forms (SPEC L7).

type FormRow = {
  id: string;
  title: string;
  body: string | null;
  deadline: string | null;
  class_id?: string;
};

function toForm(r: FormRow): ConsentForm {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    deadline: r.deadline,
  };
}

export async function listConsentForms(classId: string): Promise<ConsentForm[]> {
  const { data, error } = await supabase
    .from('consent_forms')
    .select('id, title, body, deadline')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as FormRow[]).map(toForm);
}

export async function getConsentStatus(consentId: string): Promise<ConsentStatus> {
  const { data: form, error: fErr } = await supabase
    .from('consent_forms')
    .select('id, class_id')
    .eq('id', consentId)
    .single();
  if (fErr) throw fErr;

  const classId = form.class_id as string;
  const [{ data: students, error: stErr }, { data: sigs, error: sErr }] = await Promise.all([
    supabase
      .from('students')
      .select('id, class_id, seat, name')
      .eq('class_id', classId)
      .order('seat', { ascending: true }),
    supabase.from('consent_signatures').select('student_id').eq('consent_id', consentId),
  ]);
  if (stErr) throw stErr;
  if (sErr) throw sErr;

  const signedIds = new Set((sigs ?? []).map((s) => s.student_id as string));
  const roster: Student[] = (students ?? []).map((s) => ({
    id: s.id as string,
    classId: s.class_id as string,
    seat: s.seat as string,
    name: s.name as string,
  }));
  const signed = roster.filter((s) => signedIds.has(s.id));
  const unsigned = roster.filter((s) => !signedIds.has(s.id));
  const rate = roster.length === 0 ? 0 : Math.round((signed.length / roster.length) * 100);
  return { signed, unsigned, rate };
}

export async function getMyConsentPending(studentId: string): Promise<ConsentForm[]> {
  const { data: student, error: stErr } = await supabase
    .from('students')
    .select('class_id')
    .eq('id', studentId)
    .single();
  if (stErr) throw stErr;

  const { data: forms, error: fErr } = await supabase
    .from('consent_forms')
    .select('id, title, body, deadline')
    .eq('class_id', student.class_id as string)
    .order('created_at', { ascending: false });
  if (fErr) throw fErr;

  const formRows = (forms ?? []) as FormRow[];
  if (formRows.length === 0) return [];

  const { data: sigs, error: sErr } = await supabase
    .from('consent_signatures')
    .select('consent_id')
    .eq('student_id', studentId)
    .in(
      'consent_id',
      formRows.map((f) => f.id),
    );
  if (sErr) throw sErr;

  const signed = new Set((sigs ?? []).map((s) => s.consent_id as string));
  return formRows.filter((f) => !signed.has(f.id)).map(toForm);
}

export async function createConsentForm(input: {
  classId: string;
  title: string;
  body?: string;
  deadline?: string;
}): Promise<ConsentForm> {
  const { data, error } = await supabase
    .from('consent_forms')
    .insert({
      class_id: input.classId,
      title: input.title,
      body: input.body ?? null,
      deadline: input.deadline ?? null,
    })
    .select('id, title, body, deadline')
    .single();
  if (error) throw error;
  return toForm(data as FormRow);
}

export async function signConsent(consentId: string, studentId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const parentId = userData.user?.id;
  if (!parentId) throw new Error('Not authenticated');

  const { error } = await supabase.from('consent_signatures').upsert(
    {
      consent_id: consentId,
      student_id: studentId,
      signed_by: parentId,
      signed_at: new Date().toISOString(),
    },
    { onConflict: 'consent_id,student_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

/** Notify guardians of unsigned students (Web Push). */
export async function remindUnsigned(consentId: string): Promise<{ notified: number }> {
  const status = await getConsentStatus(consentId);
  if (status.unsigned.length === 0) return { notified: 0 };

  const { data: form } = await supabase
    .from('consent_forms')
    .select('title, deadline')
    .eq('id', consentId)
    .single();

  const studentIds = status.unsigned.map((s) => s.id);
  const { data: gs, error } = await supabase
    .from('guardianships')
    .select('parent_id')
    .in('student_id', studentIds);
  if (error) throw error;
  const profileIds = [...new Set((gs ?? []).map((g) => g.parent_id as string))];

  try {
    const { sent } = await notifyProfiles({
      profileIds,
      title: '✍️ 請簽署同意書',
      body: form?.title
        ? `${form.title}${form.deadline ? ` · 截止 ${form.deadline}` : ''}`
        : '老師提醒你簽署同意書',
      url: '/p',
    });
    return { notified: sent };
  } catch {
    return { notified: profileIds.length };
  }
}
