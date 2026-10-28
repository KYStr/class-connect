import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

// Cross-parent isolation for tagged growth photos (SPEC L1).

const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUTExMWFRUXGBgYGBgYGBgYGBgYGBgYGBgYGBgYHSggGBolHRgXITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGhAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAABBQEBAAAAAAAAAAAAAAADAAIEBQYBB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A0pB//9k=',
  ),
  (c) => c.charCodeAt(0),
);

describe('RLS: growth photos', () => {
  const admin = adminClient();
  let teacherA: { email: string; password: string; id: string };
  let teacherB: { email: string; password: string; id: string };
  let parentA: { email: string; password: string; id: string };
  let parentB: { email: string; password: string; id: string };
  let classA: string;
  let studentA: string;
  let studentB: string;
  let photoId: string;
  let storagePath: string;

  beforeAll(async () => {
    teacherA = await createUser(admin, 'teacher', 'Teacher A');
    teacherB = await createUser(admin, 'teacher', 'Teacher B');
    parentA = await createUser(admin, 'parent', 'Parent A');
    parentB = await createUser(admin, 'parent', 'Parent B');

    classA = (
      await admin.from('classes').insert({ teacher_id: teacherA.id, name: 'Photo Class' }).select('id').single()
    ).data!.id;
    studentA = (
      await admin.from('students').insert({ class_id: classA, seat: '01', name: 'Child A' }).select('id').single()
    ).data!.id;
    studentB = (
      await admin.from('students').insert({ class_id: classA, seat: '02', name: 'Child B' }).select('id').single()
    ).data!.id;
    await admin.from('guardianships').insert([
      { student_id: studentA, parent_id: parentA.id },
      { student_id: studentB, parent_id: parentB.id },
    ]);

    photoId = crypto.randomUUID();
    storagePath = `class/${classA}/${photoId}.jpg`;
    const { error: upErr } = await admin.storage.from('photos').upload(storagePath, TINY_JPEG, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (upErr) throw upErr;

    const { error: photoErr } = await admin.from('photos').insert({
      id: photoId,
      class_id: classA,
      student_id: null,
      caption: 'A only',
      storage_path: storagePath,
      visibility: 'guardians',
    });
    if (photoErr) throw photoErr;
    const { error: tagErr } = await admin
      .from('photo_students')
      .insert({ photo_id: photoId, student_id: studentA });
    if (tagErr) throw tagErr;
  });

  it('parent A can read a photo tagged to their child', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data, error } = await a.from('photos').select('id').eq('id', photoId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it('parent B cannot read a photo tagged only to parent A child', async () => {
    const b = await clientFor(parentB.email, parentB.password);
    const { data, error } = await b.from('photos').select('id').eq('id', photoId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('parent B cannot sign a URL for parent A photo', async () => {
    const b = await clientFor(parentB.email, parentB.password);
    const { data, error } = await b.storage.from('photos').createSignedUrl(storagePath, 60);
    expect(error || !data?.signedUrl).toBeTruthy();
  });

  it('another class teacher cannot upload into this class path', async () => {
    const t = await clientFor(teacherB.email, teacherB.password);
    const path = `class/${classA}/${crypto.randomUUID()}.jpg`;
    const { error } = await t.storage.from('photos').upload(path, TINY_JPEG, {
      contentType: 'image/jpeg',
    });
    expect(error).toBeTruthy();
  });
});
