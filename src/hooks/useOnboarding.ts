import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  clearOnboardingSeen,
  getOnboarding,
  markOnboardingSeen,
  type OnboardingSeen,
} from '@/services/onboarding';
import { useAuth } from '@/app/AuthProvider';

export function useOnboarding() {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.onboarding.mine(),
    queryFn: getOnboarding,
    enabled: Boolean(session),
  });
}

export function useMarkOnboardingSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => markOnboardingSeen(key),
    onMutate: async (key) => {
      const qk = queryKeys.onboarding.mine();
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<OnboardingSeen>(qk);
      qc.setQueryData<OnboardingSeen>(qk, { ...(prev ?? {}), [key]: true });
      return { prev };
    },
    onError: (_e, _k, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.onboarding.mine(), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.onboarding.mine() });
    },
  });
}

export function useClearOnboardingSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keys: string[]) => clearOnboardingSeen(keys),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.onboarding.mine() });
    },
  });
}

export function hasSeen(seen: OnboardingSeen | undefined, key: string): boolean {
  return Boolean(seen?.[key]);
}
