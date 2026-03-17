import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

export interface Account {
  id: number;
  name: string;
  game_id: string;
  zone: string;
  server_id: string;
  stock_diamond: number;
  pending_wdp: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields from backend
  real_diamond: number; // Current stock_diamond
  potential_diamond: number; // stock_diamond + wdp potential
  wdp_potential_capped: number; // WDP potential (max 140)
  classification: string; // "Available" | "Forecast" | "Preorder"
}

export interface CreateAccountPayload {
  name: string;
  game_id: string;
  zone: string;
  server_id: string;
  stock_diamond: number;
  pending_wdp: number;
  is_active: boolean;
}

export const useAccounts = () => {
  return useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await apiClient.get('/api/accounts');
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
};

export const fetchAccounts = async (): Promise<Account[]> => {
  const response = await apiClient.get('/api/accounts');
  return response.data;
};

export const updateAccount = async (
  id: number,
  payload: Partial<CreateAccountPayload>
): Promise<Account> => {
  const response = await apiClient.patch(`/api/accounts/${id}`, payload);
  return response.data;
};

interface CreateAccountPayload {
  name: string;
  game_id: string;
  zone: string;
  server_id: string;
  stock_diamond: number;
  pending_wdp: number;
  is_active: boolean;
}
