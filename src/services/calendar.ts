import type { CalendarEvent } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function listEvents(_classId: string): Promise<CalendarEvent[]> {
  return [];
}

export async function addEvent(_input: {
  classId: string;
  title: string;
  eventDate: string;
  type: CalendarEvent['type'];
}): Promise<CalendarEvent> {
  return notImplemented('addEvent');
}
