import { supabase } from './supabase';

// Realtime subscription helpers (DEVELOPMENT.md §8.4).
// Implements SPEC L12: teacher change reaches parent app live.

const CLASS_TABLES = [
  'announcements',
  'homework_items',
  'bring_items',
  'exams',
  'scores',
  'events',
  'leaves',
  'consent_forms',
  'performance_notes',
  'milestones',
  'class_features',
] as const;

let channelSeq = 0;

/** Subscribe to all class-scoped tables filtered by class_id. Returns an unsubscribe fn. */
export function subscribeClass(classId: string, onChange: (table: string) => void): () => void {
  // Unique topic per subscriber — reusing `class:${id}` returns an already-subscribed
  // channel and throws if we add postgres_changes after subscribe() (e.g. teacher + preview).
  const ch = supabase.channel(`class:${classId}:${++channelSeq}`);
  for (const table of CLASS_TABLES) {
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `class_id=eq.${classId}` },
      () => onChange(table),
    );
  }
  ch.subscribe();
  return () => {
    void supabase.removeChannel(ch);
  };
}

/** `messages` has no class_id — subscribe per conversation. Returns an unsubscribe fn. */
export function subscribeConversation(conversationId: string, onChange: () => void): () => void {
  const ch = supabase.channel(`conversation:${conversationId}:${++channelSeq}`);
  ch.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    () => onChange(),
  );
  ch.subscribe();
  return () => {
    void supabase.removeChannel(ch);
  };
}
