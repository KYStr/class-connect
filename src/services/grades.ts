import { supabase } from '@/lib/supabase';
import type { DistBucket, Exam, ExamType, GradeSubject, Student } from '@/types/domain';
import { listClassGuardianIds, notifyProfiles } from '@/services/push';

// DEVELOPMENT.md §8.2 / §8.3. Privacy per SPEC L4 is enforced by RLS + de-identified dist.
// New exam columns (subject/type/archive) cast until `pnpm gen:types` after 0009.

type ExamRow = {
  id: string;
  class_id: string;
  name: string;
  published: boolean;
  show_dist: boolean;
  subject_id: string | null;
  exam_type_id: string | null;
  archived_at: string | null;
  created_at?: string;
};

function toExam(r: ExamRow): Exam {
  return {
    id: r.id,
    classId: r.class_id,
    name: r.name,
    published: r.published,
    showDist: r.show_dist,
    subjectId: r.subject_id,
    examTypeId: r.exam_type_id,
    archivedAt: r.archived_at,
  };
}

const EXAM_COLS =
  'id, class_id, name, published, show_dist, subject_id, exam_type_id, archived_at, created_at';

function examsTable() {
  return supabase.from('exams' as never);
}

export async function listExams(
  classId: string,
  opts: { archived?: boolean } = {},
): Promise<Exam[]> {
  const archived = opts.archived === true;
  let q = examsTable()
    .select(EXAM_COLS)
    .eq('class_id' as never, classId)
    .order('created_at' as never, { ascending: false });
  q = archived
    ? q.not('archived_at' as never, 'is', null)
    : q.is('archived_at' as never, null);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as unknown as ExamRow[] | null) ?? []).map(toExam);
}

export async function listSubjects(classId: string): Promise<GradeSubject[]> {
  const { data, error } = await supabase
    .from('grade_subjects' as never)
    .select('id, class_id, name, sort_order')
    .eq('class_id' as never, classId)
    .order('sort_order' as never, { ascending: true });
  if (error) throw error;
  return (
    (data as { id: string; class_id: string; name: string; sort_order: number }[] | null) ?? []
  ).map((r) => ({
    id: r.id,
    classId: r.class_id,
    name: r.name,
    sortOrder: r.sort_order,
  }));
}

export async function addSubject(classId: string, name: string): Promise<GradeSubject> {
  const { data, error } = await supabase
    .from('grade_subjects' as never)
    .insert({ class_id: classId, name: name.trim() } as never)
    .select('id, class_id, name, sort_order')
    .single();
  if (error) throw error;
  const r = data as { id: string; class_id: string; name: string; sort_order: number };
  return { id: r.id, classId: r.class_id, name: r.name, sortOrder: r.sort_order };
}

export async function listExamTypes(classId: string): Promise<ExamType[]> {
  const { data, error } = await supabase
    .from('exam_types' as never)
    .select('id, class_id, name, sort_order')
    .eq('class_id' as never, classId)
    .order('sort_order' as never, { ascending: true });
  if (error) throw error;
  return (
    (data as { id: string; class_id: string; name: string; sort_order: number }[] | null) ?? []
  ).map((r) => ({
    id: r.id,
    classId: r.class_id,
    name: r.name,
    sortOrder: r.sort_order,
  }));
}

export async function addExamType(classId: string, name: string): Promise<ExamType> {
  const { data, error } = await supabase
    .from('exam_types' as never)
    .insert({ class_id: classId, name: name.trim() } as never)
    .select('id, class_id, name, sort_order')
    .single();
  if (error) throw error;
  const r = data as { id: string; class_id: string; name: string; sort_order: number };
  return { id: r.id, classId: r.class_id, name: r.name, sortOrder: r.sort_order };
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('grade_subjects' as never).delete().eq('id' as never, id);
  if (error) throw error;
}

export async function deleteExamType(id: string): Promise<void> {
  const { error } = await supabase.from('exam_types' as never).delete().eq('id' as never, id);
  if (error) throw error;
}

export async function getMyChildScore(examId: string, studentId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('scores')
    .select('score')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data?.score ?? null;
}

export async function getDistribution(examId: string): Promise<DistBucket[]> {
  const { data, error } = await supabase.rpc('get_score_distribution', {
    p_exam_id: examId,
  });
  if (error) throw error;
  return ((data ?? []) as { range: string; lo: number; hi: number; count: number }[]).map(
    (b) => ({
      range: b.range,
      lo: b.lo,
      hi: b.hi,
      count: Number(b.count),
    }),
  );
}

export async function getPercentile(examId: string, studentId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_score_percentile', {
    p_exam_id: examId,
    p_student_id: studentId,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function getExamRoster(
  examId: string,
): Promise<{ student: Student; score: number | null }[]> {
  const { data: exam, error: eErr } = await supabase
    .from('exams')
    .select('class_id')
    .eq('id', examId)
    .single();
  if (eErr) throw eErr;

  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, class_id, seat, name')
    .eq('class_id', exam.class_id)
    .order('seat', { ascending: true });
  if (sErr) throw sErr;

  const { data: scores, error: scErr } = await supabase
    .from('scores')
    .select('student_id, score')
    .eq('exam_id', examId);
  if (scErr) throw scErr;
  const byStudent = new Map(
    (scores ?? []).map((s) => [s.student_id as string, s.score as number | null]),
  );

  return ((students ?? []) as { id: string; class_id: string; seat: string; name: string }[]).map(
    (s) => ({
      student: { id: s.id, classId: s.class_id, seat: s.seat, name: s.name },
      score: byStudent.has(s.id) ? (byStudent.get(s.id) ?? null) : null,
    }),
  );
}

export async function upsertExam(input: {
  id?: string;
  classId: string;
  name: string;
  published: boolean;
  showDist: boolean;
  subjectId?: string | null;
  examTypeId?: string | null;
}): Promise<Exam> {
  let wasPublished = false;
  if (input.id) {
    const { data: prev } = await supabase
      .from('exams')
      .select('published')
      .eq('id', input.id)
      .maybeSingle();
    wasPublished = Boolean(prev?.published);

    const patch = {
      name: input.name,
      published: input.published,
      show_dist: input.showDist,
      ...(input.subjectId !== undefined ? { subject_id: input.subjectId } : {}),
      ...(input.examTypeId !== undefined ? { exam_type_id: input.examTypeId } : {}),
    };

    const { data, error } = await examsTable()
      .update(patch as never)
      .eq('id' as never, input.id)
      .select(EXAM_COLS)
      .single();
    if (error) throw error;
    const exam = toExam(data as unknown as ExamRow);
    if (input.published && !wasPublished) {
      void listClassGuardianIds(input.classId)
        .then((profileIds) =>
          notifyProfiles({
            profileIds,
            title: '📊 成績已公布',
            body: input.name,
            url: '/p',
          }),
        )
        .catch(() => undefined);
    }
    return exam;
  }
  const { data, error } = await examsTable()
    .insert({
      class_id: input.classId,
      name: input.name,
      published: input.published,
      show_dist: input.showDist,
      subject_id: input.subjectId ?? null,
      exam_type_id: input.examTypeId ?? null,
    } as never)
    .select(EXAM_COLS)
    .single();
  if (error) throw error;
  const exam = toExam(data as unknown as ExamRow);
  if (input.published) {
    void listClassGuardianIds(input.classId)
      .then((profileIds) =>
        notifyProfiles({
          profileIds,
          title: '📊 成績已公布',
          body: input.name,
          url: '/p',
        }),
      )
      .catch(() => undefined);
  }
  return exam;
}

export async function setScore(
  examId: string,
  studentId: string,
  score: number | null,
): Promise<void> {
  if (score == null) {
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('exam_id', examId)
      .eq('student_id', studentId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('scores').upsert(
    { exam_id: examId, student_id: studentId, score },
    { onConflict: 'exam_id,student_id' },
  );
  if (error) throw error;
}

export async function archiveExam(id: string): Promise<void> {
  const { error } = await examsTable()
    .update({ archived_at: new Date().toISOString() } as never)
    .eq('id' as never, id);
  if (error) throw error;
}

export async function unarchiveExam(id: string): Promise<void> {
  const { error } = await examsTable()
    .update({ archived_at: null } as never)
    .eq('id' as never, id);
  if (error) throw error;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
}
