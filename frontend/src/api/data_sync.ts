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
}

/**
 * Export data as JSON
 */
export const exportData = async (
  exportType: 'inventory' | 'orders' | 'both'
): Promise<ExportData> => {
  const response = await apiClient.post(`/data/export?export_type=${exportType}`);
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

  const response = await apiClient.post(`/data/import-preview?import_type=${importType}`, formData, {
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

  const response = await apiClient.post(`/data/import-confirm?import_type=${importType}`, formData, {
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
