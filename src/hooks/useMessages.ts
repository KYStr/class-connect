import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { subscribeConversation } from '@/lib/realtime';
import {
  getConversation,
  listMessages,
  listTeacherInbox,
  markConversationRead,
  sendMessage,
  sendMessageAsParent,
} from '@/services/messages';
import type { Message } from '@/types/domain';

export function useConversation(classId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.conversation(classId ?? '', studentId ?? ''),
    queryFn: () => getConversation(classId as string, studentId as string),
    enabled: Boolean(classId && studentId),
  });
}

export function useTeacherInbox(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.inbox(classId ?? ''),
    queryFn: () => listTeacherInbox(classId as string),
    enabled: Boolean(classId),
    refetchInterval: 5_000,
  });
}

export function useMessages(conversationId: string | undefined) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.messages.list(conversationId ?? ''),
    queryFn: () => listMessages(conversationId as string),
    enabled: Boolean(conversationId),
    // Fallback if Realtime is slow / reconnecting.
    refetchInterval: conversationId ? 4_000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!conversationId) return;
    return subscribeConversation(conversationId, () => {
      void qc.invalidateQueries({ queryKey: queryKeys.messages.list(conversationId) });
      void qc.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    });
  }, [conversationId, qc]);

  return q;
}

export function useSendMessage(conversationId: string | undefined, as: 'teacher' | 'parent') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      as === 'teacher'
        ? sendMessage(conversationId as string, text)
        : sendMessageAsParent(conversationId as string, text),
    onMutate: async (text) => {
      if (!conversationId) return;
      const key = queryKeys.messages.list(conversationId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Message[]>(key) ?? [];
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderRole: as,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Message[]>(key, [...prev, optimistic]);
      return { prev, key };
    },
    onError: (_err, _text, ctx) => {
      if (ctx?.key && ctx.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSuccess: (msg) => {
      if (!conversationId) return;
      const key = queryKeys.messages.list(conversationId);
      qc.setQueryData<Message[]>(key, (cur = []) => {
        const withoutOptimistic = cur.filter((m) => !m.id.startsWith('optimistic-'));
        if (withoutOptimistic.some((m) => m.id === msg.id)) return withoutOptimistic;
        return [...withoutOptimistic, msg];
      });
      void qc.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    },
  });
}

export function useMarkConversationRead(classId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => markConversationRead(conversationId),
    onSuccess: () => {
      if (classId) qc.invalidateQueries({ queryKey: queryKeys.messages.inbox(classId) });
    },
  });
}
