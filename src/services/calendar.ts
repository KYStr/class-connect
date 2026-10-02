import { supabase } from '@/lib/supabase';
import type { CalendarEvent, EventRemind, EventType } from '@/types/domain';

// DEVELOPMENT.md §8.2 / §8.3 — calendar events (SPEC L10).

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  type: EventType;
  note: string | null;
  remind: string | null;
};

function toRemind(value: string | null): EventRemind {
  if (value === 'none' || value === 'eve' || value === 'morning') return value;
  return 'morning';
}

function toEvent(r: EventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    eventDate: r.event_date,
    type: r.type,
    note: r.note,
    remind: toRemind(r.remind),
  };
}

const EVENT_COLS = 'id, title, event_date, type, note, remind';

export async function listEvents(classId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLS)
    .eq('class_id', classId)
    .order('event_date', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as EventRow[]).map(toEvent);
}

export async function addEvent(input: {
  classId: string;
  title: string;
  eventDate: string;
  type: EventType;
  note?: string;
  remind?: EventRemind;
}): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      class_id: input.classId,
      title: input.title,
      event_date: input.eventDate,
      type: input.type,
      note: input.note?.trim() || null,
      remind: input.remind ?? 'morning',
    })
    .select(EVENT_COLS)
    .single();
  if (error) throw error;
  return toEvent(data as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
