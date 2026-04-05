/**
 * Data Sync API Client
 * Handles export and import of inventory and order data
 */
export interface ExportData {
    timestamp: string;
    data_type: string;
    accounts: any[];
    orders: any[];
}
export interface OrderExportData {
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
    proof_video_link?: string;
    delivery_at: string | null;
    actual_delivery_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface ImportPreview {
    data_type: string;
    records_to_delete: number;
    records_to_add: number;
    affected_items: string[];
    preview_sample: any;
}
export interface ImportResult {
    success: boolean;
    message: string;
    accounts_deleted: number;
    accounts_added: number;
    orders_deleted: number;
    orders_added: number;
    errors: string[];
    backup_created?: boolean;
}
/**
 * Export data as JSON
 */
export declare const exportData: (exportType: "inventory" | "orders" | "both") => Promise<ExportData>;
/**
 * Preview import without actually importing
 */
export declare const previewImport: (file: File, importType: "inventory" | "orders" | "both") => Promise<ImportPreview>;
/**
 * Confirm and execute import
 */
export declare const confirmImport: (file: File, importType: "inventory" | "orders" | "both") => Promise<ImportResult>;
/**
 * React Query hooks
 */
export declare const useExportData: () => import("@tanstack/react-query").UseMutationResult<ExportData, Error, "orders" | "inventory" | "both", unknown>;
export declare const useImportPreview: () => import("@tanstack/react-query").UseMutationResult<ImportPreview, Error, {
    file: File;
    importType: "inventory" | "orders" | "both";
}, unknown>;
export declare const useConfirmImport: () => import("@tanstack/react-query").UseMutationResult<ImportResult, Error, {
    file: File;
    importType: "inventory" | "orders" | "both";
}, unknown>;
