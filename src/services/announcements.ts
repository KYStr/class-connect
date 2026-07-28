import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types/domain';
import { listClassGuardianIds, notifyProfiles } from '@/services/push';

// DEVELOPMENT.md §8.2 / §8.3. RLS: is_class_member reads; is_teacher_of writes (SPEC L5).

type AnnRow = {
  id: string;
  class_id: string;
  title: string;
  body: string | null;
  important: boolean;
  published_at: string;
  scheduled_at: string | null;
};

function toAnnouncement(r: AnnRow): Announcement {
  return {
    id: r.id,
    classId: r.class_id,
    title: r.title,
    body: r.body,
    important: r.important,
    publishedAt: r.published_at,
    scheduledAt: r.scheduled_at,
  };
}

/** Parent-facing list: only already-published items, with per-parent read flag. */
export async function listAnnouncements(classId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(
      'id, class_id, title, body, important, published_at, scheduled_at, announcement_reads(parent_id)',
    )
    .eq('class_id', classId)
    .lte('published_at', new Date().toISOString())
    .order('important', { ascending: false })
    .order('published_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as (AnnRow & { announcement_reads: { parent_id: string }[] })[]).map((r) => ({
    ...toAnnouncement(r),
    // reads_parent RLS restricts the embed to the current parent's row only.
    read: (r.announcement_reads ?? []).length > 0,
  }));
}

/** Teacher-facing list: all items (incl. scheduled) + read counts. */
export async function listAnnouncementsWithStats(classId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, class_id, title, body, important, published_at, scheduled_at')
    .eq('class_id', classId)
    .order('published_at', { ascending: false });
  if (error) throw error;

  const { data: stats, error: sErr } = await supabase
    .from('v_announcement_read_stats')
    .select('announcement_id, read_count, guardian_count')
    .eq('class_id', classId);
  if (sErr) throw sErr;
  const byId = new Map(
    (stats ?? []).map((s) => [
      s.announcement_id as string,
      { read: Number(s.read_count ?? 0), total: Number(s.guardian_count ?? 0) },
    ]),
  );

  return ((data ?? []) as AnnRow[]).map((r) => ({
    ...toAnnouncement(r),
    readCount: byId.get(r.id)?.read ?? 0,
    guardianCount: byId.get(r.id)?.total ?? 0,
  }));
}

export async function createAnnouncement(input: {
  classId: string;
  title: string;
  body: string;
  important: boolean;
  scheduledAt?: string;
}): Promise<Announcement> {
  const { data: userData } = await supabase.auth.getUser();
  const authorId = userData.user?.id;
  if (!authorId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      class_id: input.classId,
      author_id: authorId,
      title: input.title,
      body: input.body || null,
      important: input.important,
      scheduled_at: input.scheduledAt ?? null,
      published_at: input.scheduledAt ?? new Date().toISOString(),
    })
    .select('id, class_id, title, body, important, published_at, scheduled_at')
    .single();
  if (error) throw error;
  const ann = toAnnouncement(data as AnnRow);
  // Fire-and-forget push (important announcements prioritized in copy).
  void listClassGuardianIds(input.classId)
    .then((profileIds) =>
      notifyProfiles({
        profileIds,
        title: input.important ? '📣 重要公告' : '📣 新公告',
        body: input.title,
        url: '/p',
      }),
    )
    .catch(() => undefined);
  return ann;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

export async function markAnnouncementRead(announcementId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const parentId = userData.user?.id;
  if (!parentId) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      { announcement_id: announcementId, parent_id: parentId },
      { onConflict: 'announcement_id,parent_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export interface AnnouncementTrackItem {
  announcementId: string;
  title: string;
  important: boolean;
  /** Students whose family has read (at least one bound parent read). */
  readCount: number;
  /** All students in the class (same denominator idea as homework tracking). */
  totalCount: number;
  /** Bound parents who have not read yet. */
  unread: {
    parentId: string;
    parentName: string;
    studentId: string;
    studentSeat: string;
    studentName: string;
    relation: string | null;
  }[];
  /** Students with no bound parent yet — they cannot read until they join. */
  unbound: {
    studentId: string;
    seat: string;
    name: string;
  }[];
}

/** Per-announcement attention list for teachers (student-based, aligned with homework). */
export async function listAnnouncementTracking(
  classId: string,
): Promise<AnnouncementTrackItem[]> {
  const [{ data: anns, error: aErr }, { data: students, error: stErr }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, important, published_at')
      .eq('class_id', classId)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }),
    supabase.from('students').select('id, seat, name').eq('class_id', classId).order('seat'),
  ]);
  if (aErr) throw aErr;
  if (stErr) throw stErr;

  const annRows = (anns ?? []) as {
    id: string;
    title: string;
    important: boolean;
    published_at: string;
  }[];
  const studentRows = (students ?? []) as { id: string; seat: string; name: string }[];
  if (annRows.length === 0) return [];

  const studentIds = studentRows.map((s) => s.id);
  const { data: guards, error: gErr } = await supabase
    .from('guardianships')
    .select('student_id, parent_id, relation')
    .in('student_id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000']);
  if (gErr) throw gErr;

  const guardRows = (guards ?? []) as {
    student_id: string;
    parent_id: string;
    relation: string | null;
  }[];
  const parentIds = [...new Set(guardRows.map((g) => g.parent_id))];
  const { data: parents, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', parentIds.length ? parentIds : ['00000000-0000-0000-0000-000000000000']);
  if (pErr) throw pErr;
  const parentName = new Map(
    ((parents ?? []) as { id: string; display_name: string }[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );
  const guardsByStudent = new Map<string, typeof guardRows>();
  for (const g of guardRows) {
    const arr = guardsByStudent.get(g.student_id) ?? [];
    arr.push(g);
    guardsByStudent.set(g.student_id, arr);
  }

  const { data: reads, error: rErr } = await supabase
    .from('announcement_reads')
    .select('announcement_id, parent_id')
    .in(
      'announcement_id',
      annRows.map((a) => a.id),
    );
  if (rErr) throw rErr;
  const readSet = new Set(
    (reads ?? []).map((r) => `${r.announcement_id as string}:${r.parent_id as string}`),
  );

  return annRows.map((a) => {
    const unbound: AnnouncementTrackItem['unbound'] = [];
    const unread: AnnouncementTrackItem['unread'] = [];
    let readCount = 0;

    for (const s of studentRows) {
      const gs = guardsByStudent.get(s.id) ?? [];
      if (gs.length === 0) {
        unbound.push({ studentId: s.id, seat: s.seat, name: s.name });
        continue;
      }
      const anyRead = gs.some((g) => readSet.has(`${a.id}:${g.parent_id}`));
      if (anyRead) {
        readCount += 1;
      } else {
        for (const g of gs) {
          unread.push({
            parentId: g.parent_id,
            parentName: parentName.get(g.parent_id) ?? '家長',
            studentId: g.student_id,
            studentSeat: s.seat,
            studentName: s.name,
            relation: g.relation,
          });
        }
      }
    }

    return {
      announcementId: a.id,
      title: a.title,
      important: a.important,
      readCount,
      totalCount: studentRows.length,
      unread,
      unbound,
    };
  });
}
