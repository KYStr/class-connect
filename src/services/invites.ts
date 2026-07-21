import { notImplemented } from './_stub';

// Invite flow (DEVELOPMENT.md §7). Parent binding goes through the redeem_invite Edge Function.
export async function createInvite(_input: {
  classId: string;
  studentId: string;
  expiresAt?: string;
}): Promise<{ code: string }> {
  return notImplemented('createInvite');
}

export async function redeemInvite(_input: {
  code: string;
  displayName: string;
  relation?: string;
}): Promise<{ studentId: string; classId: string }> {
  return notImplemented('redeemInvite');
}
