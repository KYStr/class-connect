import type { Announcement } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function listAnnouncements(_classId: string): Promise<Announcement[]> {
  return [];
}

export async function listAnnouncementsWithStats(_classId: string): Promise<Announcement[]> {
  return [];
}

export async function createAnnouncement(_input: {
  classId: string;
  title: string;
  body: string;
  important: boolean;
  scheduledAt?: string;
}): Promise<Announcement> {
  return notImplemented('createAnnouncement');
}

export async function deleteAnnouncement(_id: string): Promise<void> {
  return notImplemented('deleteAnnouncement');
}

export async function markAnnouncementRead(_announcementId: string): Promise<void> {
  return notImplemented('markAnnouncementRead');
}
