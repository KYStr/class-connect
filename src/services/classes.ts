import type { Class } from '@/types/domain';

// DEVELOPMENT.md §8.2
export async function getMyClasses(): Promise<Class[]> {
  return [];
}

export async function getClass(_classId: string): Promise<Class | null> {
  return null;
}
