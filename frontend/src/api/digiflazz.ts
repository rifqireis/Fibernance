import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

export interface PurchaseQueueItem {
  id: string;
  account_id: number;
  account_name: string;
  order_id: string;
  deficit_diamond: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED' | string;
  created_at: string;
  updated_at: string;
}

export const fetchPurchaseQueue = async (): Promise<PurchaseQueueItem[]> => {
  const response = await apiClient.get<PurchaseQueueItem[]>('/api/digiflazz/queue');
  return response.data;
};

export const usePurchaseQueue = () => {
  return useQuery<PurchaseQueueItem[], Error>({
    queryKey: ['digiflazz', 'queue'],
    queryFn: fetchPurchaseQueue,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};