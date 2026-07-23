import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeClass } from '@/lib/realtime';
import { queryKeys } from '@/lib/queryKeys';

/** Invalidate class-scoped queries when Realtime fires (SPEC L12). */
export function useClassRealtime(classId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!classId) return;
    return subscribeClass(classId, (table) => {
      switch (table) {
        case 'announcements':
          qc.invalidateQueries({ queryKey: queryKeys.announcements.list(classId) });
          qc.invalidateQueries({ queryKey: queryKeys.announcements.listWithStats(classId) });
          break;
        case 'homework_items':
        case 'bring_items':
        case 'homework_status':
          qc.invalidateQueries({ queryKey: ['contact'] });
          break;
        case 'exams':
        case 'scores':
          qc.invalidateQueries({ queryKey: queryKeys.grades.exams(classId) });
          qc.invalidateQueries({ queryKey: ['grades'] });
          break;
        case 'performance_notes':
        case 'milestones':
          qc.invalidateQueries({ queryKey: ['growth'] });
          break;
        case 'class_features':
          qc.invalidateQueries({ queryKey: queryKeys.features.forClass(classId) });
          break;
        default:
          break;
      }
    });
  }, [classId, qc]);
}
