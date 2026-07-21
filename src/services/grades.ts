import type { DistBucket, Exam, Student } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3. Privacy per SPEC L4 is enforced by RLS + de-identified dist view.
export async function listExams(_classId: string): Promise<Exam[]> {
  return [];
}

export async function getMyChildScore(_examId: string, _studentId: string): Promise<number | null> {
  return null;
}

export async function getDistribution(_examId: string): Promise<DistBucket[]> {
  return [];
}

export async function getPercentile(_examId: string, _studentId: string): Promise<number> {
  return 0;
}

export async function getExamRoster(
  _examId: string,
): Promise<{ student: Student; score: number | null }[]> {
  return [];
}

export async function upsertExam(_input: {
  id?: string;
  classId: string;
  name: string;
  published: boolean;
  showDist: boolean;
}): Promise<Exam> {
  return notImplemented('upsertExam');
}

export async function setScore(
  _examId: string,
  _studentId: string,
  _score: number | null,
): Promise<void> {
  return notImplemented('setScore');
}
