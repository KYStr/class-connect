import type { Message } from '@/types/domain';
import { notImplemented } from './_stub';

// DEVELOPMENT.md §8.2 / §8.3
export async function getConversation(
  _classId: string,
  _studentId: string,
): Promise<{ id: string; officeHours: string } | null> {
  return null;
}

export async function listMessages(_conversationId: string): Promise<Message[]> {
  return [];
}

export async function sendMessage(_conversationId: string, _text: string): Promise<Message> {
  return notImplemented('sendMessage');
}

export async function sendMessageAsParent(_conversationId: string, _text: string): Promise<Message> {
  return notImplemented('sendMessageAsParent');
}
