import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFinishOrder, useCancelOrder } from '../api/orders';
import { getOrders, ComboOrderResponse } from '../api/orders';

const Orders: React.FC = () => {
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(0, 100),
  });

  const finishMutation = useFinishOrder();
  const cancelMutation = useCancelOrder();
  const [selectedOrder, setSelectedOrder] = useState<ComboOrderResponse | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleFinish = async (orderId: string) => {
    try {
      await finishMutation.mutateAsync(orderId);
      refetch();
    } catch (err) {
      console.error('Error finishing order:', err);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order? Diamonds will be refunded.')) {
      return;
    }
    try {
      await cancelMutation.mutateAsync(orderId);
      refetch();
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  };

  const handlePrint = (order: ComboOrderResponse) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  const formatDeliveryDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }) + ', ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'SUCCESS') {
      return <span className="px-3 py-1 text-xs font-semibold text-white bg-black rounded-none">SUCCESS</span>;
    } else if (status === 'CANCELLED') {
      return <span className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-none">CANCELLED</span>;
    } else {
      return <span className="px-3 py-1 text-xs font-semibold text-white bg-gray-400 rounded-none">PENDING</span>;
    }
  };

  return (
    <div className="min-h-screen bg-white animate-fade-slide-up">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 lg:px-8 py-6 lg:py-12">
        <h1 className="text-2xl lg:text-4xl font-serif font-semibold text-black">Orders</h1>
        <p className="mt-2 text-sm text-gray-600 font-sans">
          Manage all combo orders and track deliveries
        </p>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-8">
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-600 font-sans">Loading orders...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-red-600 font-sans">Error loading orders</p>
          </div>
        )}

        {orders && orders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-600 font-sans">No orders found</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div>
            {/* Filter Tabs */}
            <div className="mb-6 flex items-center gap-0 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-6 py-4 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                  activeTab === 'active'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Active Orders ({orders.filter((o) => o.status === 'PENDING').length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                  activeTab === 'history'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                History ({orders.filter((o) => o.status !== 'PENDING').length})
              </button>
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-none pb-4">
              <table className="w-full min-w-[900px]">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Target
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Diamond
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Est. Delivery
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {orders
                    .filter((order) =>
                      activeTab === 'active'
                        ? order.status === 'PENDING'
                        : order.status !== 'PENDING'
                    )
                    .map((order, idx) => (
                      <tr
                        key={order.id}
                        className={`border-b border-gray-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-gray-100 transition-colors cursor-default`}
                      >
                        {/* Invoice */}
                        <td className="px-6 py-4 text-sm font-semibold text-black font-sans">
                          {order.invoice_ref}
                        </td>

                        {/* Target */}
                        <td className="px-6 py-4 text-sm text-charcoal font-sans">
                          <div className="font-semibold text-black">{order.target_id}</div>
                          <div className="text-xs text-gray-600">{order.server_id}</div>
                        </td>

                        {/* Diamond */}
                        <td className="px-6 py-4 text-sm font-semibold text-black font-sans">
                          {order.total_diamond.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">{getStatusBadge(order.status)}</td>

                        {/* Est. Delivery */}
                        <td className="px-6 py-4 text-sm text-charcoal font-sans">
                          {formatDeliveryDate(order.delivery_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Finish Button - Only show for PENDING */}
                            {order.status === 'PENDING' && (
                              <button
                                onClick={() => handleFinish(order.id)}
                                disabled={finishMutation.isPending}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-charcoal disabled:opacity-50 transition-colors rounded-none"
                              >
                                {finishMutation.isPending ? 'Finishing...' : 'Finish'}
                              </button>
                            )}

                            {/* Cancel Button - Only show for PENDING */}
                            {order.status === 'PENDING' && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                disabled={cancelMutation.isPending}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-none"
                              >
                                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}

                            {/* Print Button - Always show */}
                            <button
                              onClick={() => handlePrint(order)}
                              className="px-3 py-1.5 text-xs font-semibold text-black border border-black hover:bg-gray-50 transition-colors rounded-none"
                            >
                              Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Compact Expandable Cards */}
            <div className="md:hidden space-y-3">
              {orders
                .filter((order) =>
                  activeTab === 'active'
                    ? order.status === 'PENDING'
                    : order.status !== 'PENDING'
                )
                .map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-none bg-white overflow-hidden">
                    {/* Card Header - Always Visible */}
                    <button
                      onClick={() =>
                        setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                      }
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      {/* Left: Invoice & Target */}
                      <div className="flex flex-col items-start">
                        <p className="font-semibold text-black text-sm">{order.invoice_ref}</p>
                        <p className="text-xs text-gray-600 mt-1">{order.target_id}</p>
                      </div>

                      {/* Right: Diamond & Status */}
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-semibold text-black text-sm">{order.total_diamond.toLocaleString()}</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </button>

                    {/* Card Details - Expandable */}
                    {expandedOrderId === order.id && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-3">
                        {/* Item */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Item</p>
                          <p className="text-sm text-black">{order.quantity}x {order.item_name || 'N/A'}</p>
                        </div>

                        {/* Server */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Server</p>
                          <p className="text-sm text-black">{order.server_id}</p>
                        </div>

                        {/* Delivery */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Est. Delivery</p>
                          <p className="text-sm text-black">{formatDeliveryDate(order.delivery_at)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-300">
                          <div className="flex gap-2">
                            {order.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleFinish(order.id)}
                                  disabled={finishMutation.isPending}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-black hover:bg-charcoal disabled:opacity-50 transition-colors rounded-none"
                                >
                                  {finishMutation.isPending ? 'Finishing...' : 'Finish'}
                                </button>
                                <button
                                  onClick={() => handleCancel(order.id)}
                                  disabled={cancelMutation.isPending}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-none"
                                >
                                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handlePrint(order)}
                              className="flex-1 px-3 py-2 text-xs font-semibold text-black border border-black hover:bg-gray-100 transition-colors rounded-none"
                            >
                              Print
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          onClose={() => {
            setShowReceipt(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * Receipt Modal Component
 * Displays digital invoice/receipt with language toggle
 */
interface ReceiptModalProps {
  order: ComboOrderResponse;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const [language, setLanguage] = React.useState<'id' | 'en'>('id');
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Determine mode: INVOICE for PENDING, RECEIPT for SUCCESS
  const mode = order.status === 'PENDING' ? 'invoice' : 'receipt';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (language === 'id') {
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } else {
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    }
  };

  const getReceiptText = (): string => {
    const divider = '═══════════════════════════';
    const isInvoice = mode === 'invoice';

    if (language === 'id') {
      return `${divider}
FIBERNANCE - ${isInvoice ? 'INVOICE' : 'STRUK PEMBELIAN'}
${divider}

${isInvoice ? 'STATUS PESANAN: Menunggu Pengiriman' : 'STATUS PESANAN: Pesanan Selesai'}

NOMOR PESANAN: ${order.invoice_ref}
TANGGAL: ${formatDate(order.created_at)}
ITEM: ${order.quantity}x ${order.item_name || 'N/A'}
PEMBELI: ${order.buyer_name || 'N/A'}

TARGET PEMAIN
ID Pemain: ${order.target_id}
Nickname: ${order.buyer_name || 'N/A'}
Zone: ${order.server_id}

RINCIAN PEMBAYARAN
Total Diamond: ${order.total_diamond.toLocaleString()} DM

SUMBER DANA
${Object.entries(order.deduction_breakdown).map(([name, amount]) => `${name}: ${amount.toLocaleString()} DM`).join('\n')}

ESTIMASI PENGIRIMAN
${order.delivery_at ? formatDate(order.delivery_at) : 'N/A'}

${divider}
Simpan struk ini selama 7 hari.
Terima kasih!
${divider}`;
    } else {
      return `${divider}
FIBERNANCE - ${isInvoice ? 'INVOICE' : 'RECEIPT'}
${divider}

${isInvoice ? 'ORDER STATUS: Awaiting Delivery' : 'ORDER STATUS: Order Completed'}

ORDER NUMBER: ${order.invoice_ref}
DATE: ${formatDate(order.created_at)}
ITEM: ${order.quantity}x ${order.item_name || 'N/A'}
BUYER: ${order.buyer_name || 'N/A'}

TARGET PLAYER
Player ID: ${order.target_id}
Nickname: ${order.buyer_name || 'N/A'}
Zone: ${order.server_id}

PAYMENT DETAILS
Total Diamond: ${order.total_diamond.toLocaleString()} DM

PAYMENT SOURCE
${Object.entries(order.deduction_breakdown).map(([name, amount]) => `${name}: ${amount.toLocaleString()} DM`).join('\n')}

ESTIMATED DELIVERY
${order.delivery_at ? formatDate(order.delivery_at) : 'N/A'}

${divider}
Keep this receipt for 7 days.
Thank you!
${divider}`;
    }
  };

  const receiptText = getReceiptText();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      alert(language === 'id' ? '✓ Teks struk disalin!' : '✓ Receipt text copied!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert(language === 'id' ? 'Gagal menyalin teks' : 'Failed to copy text');
    }
  };

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '', 'height=600,width=400');
      if (printWindow) {
        printWindow.document.write(receiptRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-none max-h-[90vh] overflow-y-auto w-[90%] md:w-full max-w-sm shadow-lg">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-serif font-semibold text-black">
              {mode === 'invoice' ? (language === 'id' ? 'INVOICE' : 'INVOICE') : (language === 'id' ? 'STRUK' : 'RECEIPT')}
            </h2>
            <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
              <button
                onClick={() => setLanguage('id')}
                className={`px-3 py-1 text-xs font-semibold rounded-none transition-colors ${
                  language === 'id'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-none transition-colors ${
                  language === 'en'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                EN
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6">
          <div
            ref={receiptRef}
            className="font-mono text-xs text-black whitespace-pre-wrap"
            style={{ fontFamily: 'Courier New, monospace', lineHeight: '1.6' }}
          >
            {receiptText}
          </div>
        </div>

        {/* Modal Footer - Action Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={handleCopyText}
            className="flex-1 px-4 py-2 bg-gray-100 text-black font-semibold text-sm hover:bg-gray-200 transition-colors rounded-none border border-gray-300"
          >
            {language === 'id' ? 'Copy Text' : 'Copy Text'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-black text-white font-semibold text-sm hover:bg-charcoal transition-colors rounded-none"
          >
            {language === 'id' ? 'Cetak' : 'Print'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-black font-semibold text-sm hover:bg-gray-50 transition-colors rounded-none"
          >
            {language === 'id' ? 'Tutup' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Orders;
