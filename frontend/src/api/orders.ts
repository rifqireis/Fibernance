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
  created_at?: string; // Optional - if omitted, backend uses current time (WIB)
  order_id?: string; // Optional
}

export interface ComboOrderResponse {
  id: string;
  invoice_ref: string;
  order_id: string;
  target_id: string;
  server_id: string;
  buyer_name: string;
  game_username: string;
  item_name: string;
  quantity: number;
  total_diamond: number;
  status: string;
  deduction_breakdown: Record<string, number>;
  sending_accounts: Record<string, any>;
  delivery_at: string; // ISO 8601 datetime (RECEIPT/STRUK TIME - jam 15:00 WIB)
  actual_delivery_at: string; // ISO 8601 datetime (ACTUAL ORDER TIME - +7 hari real time)
  proof_video_link?: string; // Telegram URL for proof video delivery
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
 * Finish an order with proof video (mark as DONE).
 * Requires a video file to be uploaded.
 */
export const finishOrder = async (orderId: string, videoFile: File): Promise<ComboOrderResponse> => {
  const formData = new FormData();
  formData.append('file', videoFile);
  
  const response = await apiClient.post<ComboOrderResponse>(
    `/api/orders/${orderId}/finish`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
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
      // Invalidate both accounts and orders queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
