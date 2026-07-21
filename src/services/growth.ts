import type { GrowthItem, Photo } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function getGrowthTimeline(_studentId: string): Promise<GrowthItem[]> {
  return [];
}

export async function getMemoryBookStats(
  _studentId: string,
): Promise<{ photos: number; notes: number; milestones: number; latestScore: number | null }> {
  return { photos: 0, notes: 0, milestones: 0, latestScore: null };
}

export async function listPhotos(_studentId: string): Promise<Photo[]> {
  return [];
}

export async function addPerformanceNote(_input: {
  classId: string;
  studentId: string;
  emoji: string;
  title: string;
  body: string;
}): Promise<void> {
  return notImplemented('addPerformanceNote');
}

export async function addMilestone(_input: {
  classId: string;
  studentId: string;
  emoji: string;
  title: string;
  body: string;
  occurredOn: string;
}): Promise<void> {
  return notImplemented('addMilestone');
}
