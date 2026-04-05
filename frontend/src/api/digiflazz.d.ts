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
export declare const createDigiflazzTopup: (payload: DigiflazzTopupRequest) => Promise<TopupHistoryItem>;
export declare const fetchPurchaseQueue: () => Promise<PurchaseQueueItem[]>;
export declare const usePurchaseQueue: () => import("@tanstack/react-query").UseQueryResult<PurchaseQueueItem[], Error>;
