import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types/domain';

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
  return toAnnouncement(data as AnnRow);
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
