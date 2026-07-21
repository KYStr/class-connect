import type { ConsentForm, ConsentStatus } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function listConsentForms(_classId: string): Promise<ConsentForm[]> {
  return [];
}

export async function getConsentStatus(_consentId: string): Promise<ConsentStatus> {
  return { signed: [], unsigned: [], rate: 0 };
}

export async function getMyConsentPending(_studentId: string): Promise<ConsentForm[]> {
  return [];
}

export async function createConsentForm(_input: {
  classId: string;
  title: string;
  body?: string;
  deadline?: string;
}): Promise<ConsentForm> {
  return notImplemented('createConsentForm');
}

export async function signConsent(_consentId: string, _studentId: string): Promise<void> {
  return notImplemented('signConsent');
}

export async function remindUnsigned(_consentId: string): Promise<{ notified: number }> {
  return notImplemented('remindUnsigned');
}
