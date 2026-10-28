import { supabase } from '@/lib/supabase';

const BUCKET = 'photos';

export function photoObjectPath(classId: string, photoId: string): string {
  return `class/${classId}/${photoId}.jpg`;
}

export async function uploadClassPhoto(classId: string, photoId: string, blob: Blob): Promise<{ path: string }> {
  const path = photoObjectPath(classId, photoId);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return { path };
}

export async function getSignedPhotoUrls(
  paths: string[],
  expiresSec = 3600,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, expiresSec);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

export async function removePhotoObject(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
