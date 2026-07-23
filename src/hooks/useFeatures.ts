import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getClassFeatures, setClassFeature } from '@/services/features';
import type { FeatureKey } from '@/types/domain';

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
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.features.forClass(classId) });
    },
  });
}
