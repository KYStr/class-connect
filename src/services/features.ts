import { supabase } from '@/lib/supabase';
import {
  CORE_FEATURES,
  OPT_IN_FEATURES,
  type FeatureKey,
  type FeatureMap,
} from '@/types/domain';

// Progressive feature gating (SPEC L16 / DEVELOPMENT.md §5.5).
// RLS: class members read; teacher of the class manages.

function defaultMap(): FeatureMap {
  const m = {} as FeatureMap;
  CORE_FEATURES.forEach((f) => (m[f] = true));
  OPT_IN_FEATURES.forEach((f) => (m[f] = false));
  return m;
}

export async function getClassFeatures(classId: string): Promise<FeatureMap> {
  const { data, error } = await supabase
    .from('class_features')
    .select('feature, enabled')
    .eq('class_id', classId);
  if (error) throw error;
  const map = defaultMap();
  (data ?? []).forEach((row) => {
    map[row.feature as FeatureKey] = row.enabled;
  });
  // Core features are always on regardless of stored state.
  CORE_FEATURES.forEach((f) => (map[f] = true));
  return map;
}

export async function setClassFeature(
  classId: string,
  feature: FeatureKey,
  enabled: boolean,
): Promise<void> {
  // Core features cannot be turned off (SPEC L16).
  if (CORE_FEATURES.includes(feature) && !enabled) return;
  const { error } = await supabase
    .from('class_features')
    .upsert(
      { class_id: classId, feature, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'class_id,feature' },
    );
  if (error) throw error;
}
