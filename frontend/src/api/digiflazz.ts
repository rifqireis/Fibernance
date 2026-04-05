import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

export type DigiflazzTopupType = 'REGULAR' | 'LUNASI' | 'BULK';

export interface DigiflazzTopupRequest {
  account_id: number;
  sku: string;
  type: DigiflazzTopupType;
}

export interface TopupHistoryItem {
  id: string;
  account_id: number;
  ref_id: string;
  sku: string;
  amount_diamond: number;
  status: string;
  type: DigiflazzTopupType | string;
  is_processed: boolean;
  response_payload: string | null;
  created_at: string;
  updated_at: string;
}

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

export const createDigiflazzTopup = async (
  payload: DigiflazzTopupRequest
): Promise<TopupHistoryItem> => {
  const response = await apiClient.post<TopupHistoryItem>('/api/digiflazz/topup', payload);
  return response.data;
};

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