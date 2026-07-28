import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getClassFeatures, setClassFeature } from '@/services/features';
import type { FeatureKey, FeatureMap } from '@/types/domain';

export function useFeatures(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.features.forClass(classId ?? ''),
    queryFn: () => getClassFeatures(classId as string),
    enabled: Boolean(classId),
  });
}

export function useSetFeature(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feature, enabled }: { feature: FeatureKey; enabled: boolean }) =>
      setClassFeature(classId as string, feature, enabled),
    onMutate: async ({ feature, enabled }) => {
      if (!classId) return;
      const key = queryKeys.features.forClass(classId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FeatureMap>(key);
      if (prev) qc.setQueryData<FeatureMap>(key, { ...prev, [feature]: enabled });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (classId && ctx?.prev) {
        qc.setQueryData(queryKeys.features.forClass(classId), ctx.prev);
      }
    },
    onSettled: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.features.forClass(classId) });
    },
  });
}
