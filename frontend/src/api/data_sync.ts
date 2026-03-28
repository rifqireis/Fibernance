/**
 * Data Sync API Client
 * Handles export and import of inventory and order data
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from './client';

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
  delivery_at: string | null;  // Receipt/Struk time (jam 15:00)
  actual_delivery_at: string | null;  // Order real time (+7 hari)
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
export const exportData = async (
  exportType: 'inventory' | 'orders' | 'both'
): Promise<ExportData> => {
  const response = await apiClient.post(`/api/data/export?export_type=${exportType}`);
  return response.data;
};

/**
 * Preview import without actually importing
 */
export const previewImport = async (
  file: File,
  importType: 'inventory' | 'orders' | 'both'
): Promise<ImportPreview> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`/api/data/import-preview?import_type=${importType}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Confirm and execute import
 */
export const confirmImport = async (
  file: File,
  importType: 'inventory' | 'orders' | 'both'
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`/api/data/import-confirm?import_type=${importType}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * React Query hooks
 */

export const useExportData = () => {
  return useMutation({
    mutationFn: (exportType: 'inventory' | 'orders' | 'both') => exportData(exportType),
  });
};

export const useImportPreview = () => {
  return useMutation({
    mutationFn: ({ file, importType }: { file: File; importType: 'inventory' | 'orders' | 'both' }) =>
      previewImport(file, importType),
  });
};

export const useConfirmImport = () => {
  return useMutation({
    mutationFn: ({ file, importType }: { file: File; importType: 'inventory' | 'orders' | 'both' }) =>
      confirmImport(file, importType),
  });
};
