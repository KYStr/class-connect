import { notImplemented } from './_stub';

// Storage: photos bucket (DEVELOPMENT.md §8.5). path: class/{classId}/{studentId ?? 'class'}/{uuid}.{ext}
export async function uploadClassPhoto(
  _classId: string,
  _studentId: string | null,
  _file: File,
): Promise<{ path: string }> {
  return notImplemented('uploadClassPhoto');
}

export async function getSignedPhotoUrl(_path: string, _expiresSec = 3600): Promise<string> {
  return notImplemented('getSignedPhotoUrl');
}
