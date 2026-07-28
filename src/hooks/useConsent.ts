import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  createConsentForm,
  getConsentStatus,
  getMyConsentPending,
  listConsentForms,
  remindUnsigned,
  signConsent,
} from '@/services/consent';

export function useConsentForms(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.consent.forms(classId ?? ''),
    queryFn: () => listConsentForms(classId as string),
    enabled: Boolean(classId),
  });
}

export function useConsentStatus(consentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.consent.status(consentId ?? ''),
    queryFn: () => getConsentStatus(consentId as string),
    enabled: Boolean(consentId),
  });
}

export function useMyConsentPending(studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.consent.myPending(studentId ?? ''),
    queryFn: () => getMyConsentPending(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useCreateConsentForm(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body?: string; deadline?: string }) =>
      createConsentForm({ classId: classId as string, ...input }),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.consent.forms(classId) });
      qc.invalidateQueries({ queryKey: ['consent'] });
    },
  });
}

export function useSignConsent(studentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (consentId: string) => signConsent(consentId, studentId as string),
    onSuccess: () => {
      if (studentId) {
        qc.invalidateQueries({ queryKey: queryKeys.consent.myPending(studentId) });
      }
      qc.invalidateQueries({ queryKey: ['consent'] });
    },
  });
}

export function useRemindUnsigned() {
  return useMutation({
    mutationFn: (consentId: string) => remindUnsigned(consentId),
  });
}
