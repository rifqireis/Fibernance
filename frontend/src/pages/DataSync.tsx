import React, { useState, useRef } from 'react';
import { useExportData, useImportPreview, useConfirmImport } from '../api/data_sync';
import type { ImportPreview, ImportResult } from '../api/data_sync';

const DataSync: React.FC = () => {
  const [exportType, setExportType] = useState<'inventory' | 'orders' | 'both'>('both');
  const [importType, setImportType] = useState<'inventory' | 'orders' | 'both'>('both');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const exportMutation = useExportData();
  const previewMutation = useImportPreview();
  const confirmMutation = useConfirmImport();

  // Handle Export
  const handleExport = async () => {
    try {
      const data = await exportMutation.mutateAsync(exportType);
      
      // Create JSON file and download
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fibernance_${exportType}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('✅ Data exported successfully!');
    } catch (error: any) {
      alert(`❌ Export failed: ${error.message}`);
    }
  };

  // Handle Import File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportPreview(null); // Reset preview
    }
  };

  // Handle Preview Import
  const handlePreviewImport = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      const preview = await previewMutation.mutateAsync({
        file: selectedFile,
        importType,
      });
      setImportPreview(preview);
      setShowPreviewModal(true);
    } catch (error: any) {
      alert(`❌ Preview failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Handle Confirm Import
  const handleConfirmImport = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    // Final confirmation
    const confirmed = window.confirm(
      '⚠️ WARNING: This will DELETE ALL EXISTING DATA and REPLACE with imported data. Continue?'
    );

    if (!confirmed) return;

    try {
      const result = await confirmMutation.mutateAsync({
        file: selectedFile,
        importType,
      });
      setImportResult(result);
      setShowPreviewModal(false);
      setShowResultModal(true);
      setSelectedFile(null);
      setImportPreview(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      alert(`❌ Import failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-black mb-2">Data Sync</h1>
        <p className="text-gray-600">Export and import your inventory and order data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EXPORT SECTION */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
            <span className="text-2xl">📥</span> Export Data
          </h2>

          {/* Export Type Selection */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-700">Select data to export:</label>
            <div className="space-y-3">
              {(['inventory', 'orders', 'both'] as const).map((type) => (
                <label key={type} className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value={type}
                    checked={exportType === type}
                    onChange={(e) => setExportType(e.target.value as typeof type)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 font-medium">
                    {type === 'inventory' && '📦 Inventory Only'}
                    {type === 'orders' && '📋 Orders Only'}
                    {type === 'both' && '📦 Inventory + Orders'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="w-full px-4 py-3 bg-black text-white rounded font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {exportMutation.isPending ? '⏳ Exporting...' : '📥 Export Data'}
          </button>
        </div>

        {/* IMPORT SECTION */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
            <span className="text-2xl">📤</span> Import Data
          </h2>

          {/* Import Type Selection */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-700">Select data to import:</label>
            <div className="space-y-3">
              {(['inventory', 'orders', 'both'] as const).map((type) => (
                <label key={type} className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="importType"
                    value={type}
                    checked={importType === type}
                    onChange={(e) => setImportType(e.target.value as typeof type)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 font-medium">
                    {type === 'inventory' && '📦 Inventory Only'}
                    {type === 'orders' && '📋 Orders Only'}
                    {type === 'both' && '📦 Inventory + Orders'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select JSON file:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="w-full px-4 py-2 border border-gray-200 rounded bg-white text-gray-900"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600">✅ File selected: {selectedFile.name}</p>
            )}
          </div>

          {/* Preview Button */}
          <button
            onClick={handlePreviewImport}
            disabled={!selectedFile || previewMutation.isPending}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 mb-3"
          >
            {previewMutation.isPending ? '⏳ Loading preview...' : '👁️ Preview Changes'}
          </button>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {showPreviewModal && importPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <h3 className="text-xl font-bold text-black">Import Preview</h3>
              <p className="text-gray-600 text-sm mt-1">
                Review changes before importing
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-900">⚠️ Summary of Changes</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-red-600">🗑️ Records to DELETE: <span className="font-bold">{importPreview.records_to_delete}</span></p>
                  <p className="text-green-600">➕ Records to ADD: <span className="font-bold">{importPreview.records_to_add}</span></p>
                </div>
              </div>

              {/* Affected Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Items Affected ({importPreview.affected_items.length}):</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50 p-3 rounded">
                  {importPreview.affected_items.slice(0, 10).map((item, index) => (
                    <p key={index} className="text-sm text-gray-700 font-mono">
                      {item}
                    </p>
                  ))}
                  {importPreview.affected_items.length > 10 && (
                    <p className="text-sm text-gray-500 italic">
                      ... and {importPreview.affected_items.length - 10} more
                    </p>
                  )}
                </div>
              </div>

              {/* Sample Data */}
              {Object.keys(importPreview.preview_sample).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Sample Data:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-20">
                    {JSON.stringify(importPreview.preview_sample, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={confirmMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {confirmMutation.isPending ? '⏳ Importing...' : '⚠️ Confirm & Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT MODAL */}
      {showResultModal && importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className={`p-6 border-b-4 ${importResult.success ? 'border-green-500' : 'border-red-500'}`}>
              <h3 className="text-xl font-bold text-black flex items-center gap-2">
                {importResult.success ? '✅ Import Successful' : '❌ Import Failed'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-900">{importResult.message}</p>

              {importResult.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 text-sm">
                  {importResult.accounts_added > 0 && (
                    <p className="text-green-800">✅ {importResult.accounts_added} accounts imported</p>
                  )}
                  {importResult.accounts_deleted > 0 && (
                    <p className="text-orange-800">🗑️ {importResult.accounts_deleted} old accounts deleted</p>
                  )}
                  {importResult.orders_added > 0 && (
                    <p className="text-green-800">✅ {importResult.orders_added} orders imported</p>
                  )}
                  {importResult.orders_deleted > 0 && (
                    <p className="text-orange-800">🗑️ {importResult.orders_deleted} old orders deleted</p>
                  )}
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">Errors:</p>
                  <div className="space-y-1 text-xs text-red-700 max-h-24 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setImportResult(null);
                  window.location.reload(); // Reload to show updated data
                }}
                className="w-full px-4 py-2 bg-black text-white rounded font-semibold hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSync;
