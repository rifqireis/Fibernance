import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

export interface ComboOrderPayload {
  target_id: string;
  server_id: string;
  total_diamond: number;
  selected_account_ids: number[];
  buyer_name: string; // NEW: Name of buyer/customer
  item_name: string; // NEW: Name of product (e.g., Starlight Card)
  quantity: number; // NEW: Quantity of items
}

export interface ComboOrderResponse {
  id: string;
  invoice_ref: string;
  target_id: string;
  server_id: string;
  total_diamond: number;
  status: string;
  buyer_name: string;
  item_name: string;
  quantity: number; // NEW: Quantity of items
  deduction_breakdown: Record<string, number>;
  delivery_at: string; // ISO 8601 datetime
  created_at: string;
  updated_at: string;
}

/**
 * Create a combo order by calling the backend API.
 * Deducts diamonds from selected accounts immediately.
 * Stock is reserved at order creation time.
 */
export const createComboOrder = async (
  payload: ComboOrderPayload
): Promise<ComboOrderResponse> => {
  const response = await apiClient.post<ComboOrderResponse>(
    '/api/orders/combo',
    payload
  );
  return response.data;
};

/**
 * Finish an order (mark as SUCCESS).
 * Stock was already reserved at creation time.
 */
export const finishOrder = async (orderId: string): Promise<ComboOrderResponse> => {
  const response = await apiClient.post<ComboOrderResponse>(
    `/api/orders/${orderId}/finish`
  );
  return response.data;
};

/**
 * Cancel an order and refund diamonds back to source accounts.
 */
export const cancelOrder = async (orderId: string): Promise<ComboOrderResponse> => {
  const response = await apiClient.post<ComboOrderResponse>(
    `/api/orders/${orderId}/cancel`
  );
  return response.data;
};

/**
 * React Query mutation hook for creating a combo order.
 * Automatically invalidates accounts query on success.
 */
export const useCreateComboOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComboOrder,
    onSuccess: (data) => {
      // Invalidate accounts query to refresh stock diamonds
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      return data;
    },
  });
};

/**
 * React Query mutation hook for finishing an order.
 * Automatically invalidates orders query on success.
 */
export const useFinishOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: finishOrder,
    onSuccess: (data) => {
      // Invalidate orders query to refresh order list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      return data;
    },
  });
};

/**
 * React Query mutation hook for cancelling an order.
 * Automatically invalidates accounts and orders queries on success.
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (data) => {
      // Invalidate both accounts and orders queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      return data;
    },
  });
};

/**
 * Fetch list of orders from backend API.
 * Used by Orders page to display all orders.
 */
export const getOrders = async (
  skip: number = 0,
  limit: number = 50
): Promise<ComboOrderResponse[]> => {
  const response = await apiClient.get<ComboOrderResponse[]>(
    '/api/orders',
    { params: { skip, limit } }
  );
  return response.data;
};
