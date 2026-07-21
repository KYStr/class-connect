import type { BringItem, HomeworkItem } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function listHomework(
  _classId: string,
  _date: string,
  _studentId?: string,
): Promise<HomeworkItem[]> {
  return [];
}

export async function listBring(_classId: string, _date: string): Promise<BringItem[]> {
  return [];
}

export async function getHomeworkCompletion(
  _classId: string,
  _date: string,
): Promise<{ done: number; total: number }> {
  return { done: 0, total: 0 };
}

export async function addHomework(_input: {
  classId: string;
  dueDate: string;
  text: string;
  note?: string;
}): Promise<HomeworkItem> {
  return notImplemented('addHomework');
}

export async function addBring(_input: {
  classId: string;
  dueDate: string;
  text: string;
  note?: string;
}): Promise<BringItem> {
  return notImplemented('addBring');
}

export async function copyYesterdayContact(_classId: string, _targetDate: string): Promise<void> {
  return notImplemented('copyYesterdayContact');
}

export async function toggleHomeworkDone(
  _homeworkId: string,
  _studentId: string,
  _done: boolean,
): Promise<void> {
  return notImplemented('toggleHomeworkDone');
}
