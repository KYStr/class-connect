import { supabase } from '@/lib/supabase';
import type { Message, Role } from '@/types/domain';
import { getClassTeacherId, notifyProfiles } from '@/services/push';

// DEVELOPMENT.md §8.2 / §8.3 — 1:1 messaging (SPEC L8).

type MsgRow = {
  id: string;
  conversation_id: string;
  sender_role: Role;
  text: string;
  created_at: string;
};

function toMessage(r: MsgRow): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderRole: r.sender_role,
    text: r.text,
    createdAt: r.created_at,
  };
}

export interface InboxThread {
  conversationId: string | null;
  studentId: string;
  studentName: string;
  seat: string;
  lastText: string | null;
  lastAt: string | null;
  unread: number;
}

export async function getConversation(
  classId: string,
  studentId: string,
): Promise<{ id: string; officeHours: string }> {
  const { data: existing, error: findErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (findErr) throw findErr;

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: created, error: insErr } = await supabase
      .from('conversations')
      .insert({ class_id: classId, student_id: studentId })
      .select('id')
      .single();
    if (insErr) {
      const { data: again, error: againErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .single();
      if (againErr) throw insErr;
      conversationId = again.id as string;
    } else {
      conversationId = created.id as string;
    }
  }

  const { data: cls, error: cErr } = await supabase
    .from('classes')
    .select('office_hours')
    .eq('id', classId)
    .single();
  if (cErr) throw cErr;

  return {
    id: conversationId,
    officeHours: (cls.office_hours as string) || '平日 17:00–20:00',
  };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_role, text, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MsgRow[]).map(toMessage);
}

/** Teacher inbox: roster + last message + unread (parent msgs without read_at). */
export async function listTeacherInbox(classId: string): Promise<InboxThread[]> {
  const [{ data: students, error: stErr }, { data: convs, error: cErr }] = await Promise.all([
    supabase
      .from('students')
      .select('id, seat, name')
      .eq('class_id', classId)
      .order('seat', { ascending: true }),
    supabase.from('conversations').select('id, student_id').eq('class_id', classId),
  ]);
  if (stErr) throw stErr;
  if (cErr) throw cErr;

  const convByStudent = new Map(
    (convs ?? []).map((c) => [c.student_id as string, c.id as string]),
  );
  const convIds = (convs ?? []).map((c) => c.id as string);

  type Meta = { lastText: string | null; lastAt: string | null; unread: number };
  const meta = new Map<string, Meta>();

  if (convIds.length > 0) {
    const { data: msgs, error: mErr } = await supabase
      .from('messages')
      .select('conversation_id, text, created_at, sender_role, read_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });
    if (mErr) throw mErr;

    for (const m of msgs ?? []) {
      const cid = m.conversation_id as string;
      const cur = meta.get(cid) ?? { lastText: null, lastAt: null, unread: 0 };
      if (!cur.lastAt) {
        cur.lastText = m.text as string;
        cur.lastAt = m.created_at as string;
      }
      if (m.sender_role === 'parent' && !m.read_at) cur.unread += 1;
      meta.set(cid, cur);
    }
  }

  const threads: InboxThread[] = (students ?? []).map((s) => {
    const studentId = s.id as string;
    const conversationId = convByStudent.get(studentId) ?? null;
    const m = conversationId ? meta.get(conversationId) : undefined;
    return {
      conversationId,
      studentId,
      studentName: s.name as string,
      seat: s.seat as string,
      lastText: m?.lastText ?? null,
      lastAt: m?.lastAt ?? null,
      unread: m?.unread ?? 0,
    };
  });

  return threads.sort((a, b) => {
    if (a.unread !== b.unread) return b.unread - a.unread;
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.seat.localeCompare(b.seat, 'zh-Hant', { numeric: true });
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'parent')
    .is('read_at', null);
  if (error) throw error;
}

async function sendAs(conversationId: string, text: string, role: Role): Promise<Message> {
  const { data: userData } = await supabase.auth.getUser();
  const senderId = userData.user?.id;
  if (!senderId) throw new Error('Not authenticated');
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty message');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_role: role,
      text: trimmed,
    })
    .select('id, conversation_id, sender_role, text, created_at')
    .single();
  if (error) throw error;
  const msg = toMessage(data as MsgRow);

  // Notify the other party (best-effort).
  void (async () => {
    const { data: conv } = await supabase
      .from('conversations')
      .select('class_id, student_id')
      .eq('id', conversationId)
      .single();
    if (!conv) return;
    const preview = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
    if (role === 'parent') {
      const teacherId = await getClassTeacherId(conv.class_id as string);
      if (teacherId) {
        await notifyProfiles({
          profileIds: [teacherId],
          title: '💬 家長私訊',
          body: preview,
          url: '/t',
        });
      }
    } else {
      const { data: gs } = await supabase
        .from('guardianships')
        .select('parent_id')
        .eq('student_id', conv.student_id as string);
      const ids = [...new Set((gs ?? []).map((g) => g.parent_id as string))];
      if (ids.length) {
        await notifyProfiles({
          profileIds: ids,
          title: '💬 老師回覆',
          body: preview,
          url: '/p',
        });
      }
    }
  })().catch(() => undefined);

  return msg;
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
  return sendAs(conversationId, text, 'teacher');
}

export async function sendMessageAsParent(conversationId: string, text: string): Promise<Message> {
  return sendAs(conversationId, text, 'parent');
}
