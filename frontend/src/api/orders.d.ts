export interface ComboOrderPayload {
    target_id: string;
    server_id: string;
    total_diamond: number;
    selected_account_ids: number[];
    buyer_name: string;
    item_name: string;
    quantity: number;
    created_at?: string;
    order_id?: string;
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
    delivery_at: string;
    actual_delivery_at: string;
    proof_video_link?: string;
    created_at: string;
    updated_at: string;
}
/**
 * Create a combo order by calling the backend API.
 * Deducts diamonds from selected accounts immediately.
 * Stock is reserved at order creation time.
 */
export declare const createComboOrder: (payload: ComboOrderPayload) => Promise<ComboOrderResponse>;
/**
 * Finish an order with proof video (mark as DONE).
 * Requires a video file to be uploaded.
 */
export declare const finishOrder: (orderId: string, videoFile: File) => Promise<ComboOrderResponse>;
/**
 * Cancel an order and refund diamonds back to source accounts.
 */
export declare const cancelOrder: (orderId: string) => Promise<ComboOrderResponse>;
/**
 * React Query mutation hook for creating a combo order.
 * Automatically invalidates accounts query on success.
 */
export declare const useCreateComboOrder: () => import("@tanstack/react-query").UseMutationResult<ComboOrderResponse, Error, ComboOrderPayload, unknown>;
/**
 * React Query mutation hook for cancelling an order.
 * Automatically invalidates accounts and orders queries on success.
 */
export declare const useCancelOrder: () => import("@tanstack/react-query").UseMutationResult<ComboOrderResponse, Error, string, unknown>;
/**
 * Fetch list of orders from backend API.
 * Used by Orders page to display all orders.
 */
export declare const getOrders: (skip?: number, limit?: number) => Promise<ComboOrderResponse[]>;
