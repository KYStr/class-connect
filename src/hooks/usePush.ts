import { useMutation } from '@tanstack/react-query';
import { disablePushNotifications, enablePushNotifications } from '@/services/push';

export function useEnablePush() {
  return useMutation({ mutationFn: () => enablePushNotifications() });
}

export function useDisablePush() {
  return useMutation({ mutationFn: () => disablePushNotifications() });
}
