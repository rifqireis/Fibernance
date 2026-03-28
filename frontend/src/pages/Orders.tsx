import React, { useState, useMemo, useEffect } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'item' | 'diamond'>('date-desc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [, setUpdateTrigger] = useState(0); // Trigger re-render untuk countdown update

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

  // Countdown timer - update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate countdown time remaining until delivery
  const calculateCountdown = (deliveryDateString: string | undefined): string => {
    if (!deliveryDateString) return '—';
    
    const now = new Date();
    const deliveryDate = new Date(deliveryDateString);
    const diff = deliveryDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Delivered'; // Order sudah dikirim
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Format datetime to WIB (UTC+7) timezone
  const formatDateTimeInWIB = (utcDateString: string | undefined): string => {
    if (!utcDateString) return 'N/A';
    
    // Parse the UTC ISO string
    const utcDate = new Date(utcDateString);
    
    // Extract UTC components
    let day = utcDate.getUTCDate();
    let month = utcDate.getUTCMonth();
    let year = utcDate.getUTCFullYear();
    let hours = utcDate.getUTCHours();
    const minutes = utcDate.getUTCMinutes();
    
    // Add 7 hours for WIB timezone
    hours += 7;
    
    // Handle day overflow (if hours >= 24)
    if (hours >= 24) {
      hours -= 24;
      day += 1;
      
      // Handle month/year overflow
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      if (day > daysInMonth) {
        day = 1;
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
    }
    
    // Format with month names
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[month];
    const yearStr = year.toString().slice(-2);
    const dayStr = day.toString().padStart(2, '0');
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${dayStr} ${monthStr} ${yearStr}, ${hoursStr}:${minutesStr}`;
  };

  const formatDeliveryDate = (dateString: string | undefined): string => {
    return formatDateTimeInWIB(dateString);
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

  // Search logic - memoized for performance
  const searchOrders = (ordersToSearch: ComboOrderResponse[], term: string): ComboOrderResponse[] => {
    if (!term.trim()) return ordersToSearch;
    
    const lowerTerm = term.toLowerCase().trim();
    // Multi-field search: Order ID, Game ID, Buyer Name, Game Username, Item Name
    return ordersToSearch.filter((order) => {
      return (
        order.invoice_ref.toLowerCase().includes(lowerTerm) ||
        order.target_id.toLowerCase().includes(lowerTerm) ||
        order.buyer_name.toLowerCase().includes(lowerTerm) ||
        order.game_username.toLowerCase().includes(lowerTerm) ||
        order.item_name.toLowerCase().includes(lowerTerm)
      );
    });
  };

  // Sort logic - memoized for performance
  const sortOrders = (ordersToSort: ComboOrderResponse[]): ComboOrderResponse[] => {
    const sorted = [...ordersToSort];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.delivery_at).getTime() - new Date(a.delivery_at).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.delivery_at).getTime() - new Date(b.delivery_at).getTime());
      case 'item':
        return sorted.sort((a, b) => a.item_name.localeCompare(b.item_name));
      case 'diamond':
        return sorted.sort((a, b) => 
          sortDirection === 'desc' 
            ? b.total_diamond - a.total_diamond 
            : a.total_diamond - b.total_diamond
        );
      default:
        return sorted;
    }
  };

  // Filter and sort orders based on search term and sort option (memoized)
  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];
    const filtered = searchOrders(orders, searchTerm);
    return sortOrders(filtered);
  }, [orders, searchTerm, sortBy, sortDirection]);

  return (
    <div className="min-h-screen bg-white animate-fade-slide-up">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 lg:px-8 py-6 lg:py-12">
        <h1 className="text-2xl lg:text-4xl font-serif font-semibold text-black">Orders</h1>
        <p className="mt-2 text-sm text-gray-600 font-sans">
          Manage all combo orders and track deliveries
        </p>
      </div>

      {/* Search & Sort Bar */}
      <div className="border-b border-gray-200 px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari: Order ID, ID Game, Nama Pembeli, atau Username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-none focus:border-black focus:outline-none transition-colors"
            />
            {searchTerm && (
              <p className="mt-1 text-xs text-gray-600">
                Ditemukan <span className="font-semibold">{filteredAndSortedOrders.length}</span> pesanan
              </p>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 items-center lg:flex-shrink-0">
            <label className="text-xs font-semibold text-charcoal uppercase tracking-wide whitespace-nowrap">
              Sortir:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 bg-white rounded-none focus:border-black focus:outline-none transition-colors cursor-pointer"
            >
              <option value="date-desc">Pengiriman (Terbaru)</option>
              <option value="date-asc">Pengiriman (Terdekat)</option>
              <option value="item">Nama Item (A-Z)</option>
              <option value="diamond">Total Diamond</option>
            </select>

            {/* Sort Direction Icon */}
            {sortBy === 'diamond' && (
              <button
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                className="p-2 border border-gray-300 hover:bg-gray-50 transition-colors rounded-none"
                title={sortDirection === 'desc' ? 'Terbesar ke Terkecil' : 'Terkecil ke Terbesar'}
              >
                {/* Sort Icon - Lines getting smaller going down */}
                <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="3" y1="5" x2="21" y2="5" strokeWidth="2" strokeLinecap="round" />
                  <line x1="5" y1="11" x2="19" y2="11" strokeWidth="2" strokeLinecap="round" />
                  <line x1="9" y1="17" x2="15" y2="17" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
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

        {filteredAndSortedOrders && filteredAndSortedOrders.length === 0 && orders && orders.length > 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-600 font-sans">Tidak ada pesanan yang sesuai dengan pencarian</p>
          </div>
        )}

        {filteredAndSortedOrders && filteredAndSortedOrders.length > 0 && (
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
                Active Orders ({filteredAndSortedOrders.filter((o) => o.status === 'PENDING').length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                  activeTab === 'history'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                History ({filteredAndSortedOrders.filter((o) => o.status !== 'PENDING').length})
              </button>
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-none pb-4">
              <table className="w-full min-w-[1200px]">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Item
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Buyer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Game Account
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Diamond
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-black font-sans uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {filteredAndSortedOrders
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

                        {/* Item */}
                        <td className="px-6 py-4 text-sm text-charcoal font-sans">
                          <div className="font-semibold text-black">{order.quantity}x {order.item_name}</div>
                        </td>

                        {/* Buyer */}
                        <td className="px-6 py-4 text-sm text-charcoal font-sans">
                          <div className="text-black">{order.buyer_name}</div>
                        </td>

                        {/* Game Account */}
                        <td className="px-6 py-4 text-sm text-charcoal font-sans">
                          <div className="font-semibold text-black">{order.target_id}</div>
                          {order.game_username && (
                            <div className="text-xs text-gray-600">{order.game_username}</div>
                          )}
                          <div className="text-xs text-gray-600">Zone: {order.server_id}</div>
                        </td>

                        {/* Diamond */}
                        <td className="px-6 py-4 text-sm font-semibold text-black font-sans">
                          {order.total_diamond.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">{getStatusBadge(order.status)}</td>

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
              {filteredAndSortedOrders
                .filter((order) =>
                  activeTab === 'active'
                    ? order.status === 'PENDING'
                    : order.status !== 'PENDING'
                )
                .map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-none bg-white overflow-hidden">
                    {/* Card Header - Always Visible (Summary Info - Minimalis) */}
                    <button
                      onClick={() =>
                        setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                      }
                      className="w-full px-4 py-2 flex flex-col gap-1.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Row 1: Item + Status + Countdown (Right) */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-black text-sm truncate">{order.quantity}x {order.item_name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(order.status)}
                          {/* Countdown Timer - Right side */}
                          {order.status === 'PENDING' && (
                            <div className="text-xs font-semibold text-white bg-black px-2 py-1 rounded-none whitespace-nowrap">
                              {calculateCountdown(order.delivery_at)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Pembeli | Game ID & Zone */}
                      <div className="flex justify-between gap-2 text-xs text-gray-700">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="font-semibold">Pembeli:</span> {order.buyer_name}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="font-semibold">ID:</span> {order.target_id}
                          {order.game_username && (
                            <div className="text-xs">@{order.game_username}</div>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Akun Pengiriman */}
                      {order.sending_accounts && Object.keys(order.sending_accounts).length > 0 && (
                        <div className="text-xs text-gray-700 truncate">
                          <span className="font-semibold">Akun:</span>{' '}
                          {Object.entries(order.sending_accounts).map(([, accountData]: [string, any], idx) => {
                            const accountName = typeof accountData === 'object' && accountData.name ? accountData.name : accountData;
                            return (
                              <span key={accountName}>
                                {idx > 0 && ' • '}
                                {accountName}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Row 4: Pengiriman Time (Compact) */}
                      <div className="text-xs text-gray-600">
                        📦 {formatDeliveryDate(order.delivery_at)}
                      </div>
                    </button>

                    {/* Card Details - Expandable (Full Details) */}
                    {expandedOrderId === order.id && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-3">
                        {/* Invoice Reference */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Invoice Reference</p>
                          <p className="text-sm text-black font-mono">{order.invoice_ref}</p>
                        </div>

                        {/* Item Details */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Item Pesanan</p>
                          <p className="text-sm text-black">{order.quantity}x {order.item_name || 'N/A'}</p>
                        </div>

                        {/* Buyer Name */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Nama Pembeli</p>
                          <p className="text-sm text-black">{order.buyer_name}</p>
                        </div>

                        {/* Game Account - Full Details */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Game Account (Target)</p>
                          <div className="text-sm text-black space-y-1">
                            <p><span className="font-semibold">Player ID:</span> {order.target_id}</p>
                            {order.game_username && (
                              <p><span className="font-semibold">Username:</span> {order.game_username}</p>
                            )}
                            <p><span className="font-semibold">Zone/Server:</span> {order.server_id}</p>
                          </div>
                        </div>

                        {/* Diamond Details */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Total Diamond</p>
                          <p className="text-sm text-black font-semibold">{order.total_diamond.toLocaleString()} 💎</p>
                        </div>

                        {/* Processing Accounts - Full Details */}
                        {order.sending_accounts && Object.keys(order.sending_accounts).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Akun Pengiriman (Processing)</p>
                            <div className="text-sm text-black space-y-1">
                              {Object.entries(order.sending_accounts).map(([accountId, accountData]: [string, any]) => {
                                const accountName = typeof accountData === 'object' && accountData.name ? accountData.name : accountData;
                                const deduction = order.deduction_breakdown[accountId] || 0;
                                return (
                                  <div key={accountId} className="flex justify-between items-center p-2 bg-white border border-gray-200 rounded">
                                    <span className="font-semibold">{accountName}</span>
                                    <span className="text-gray-600">{deduction.toLocaleString()} 💎</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Delivery Information */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Estimasi Pengiriman</p>
                          <p className="text-sm text-black">{formatDeliveryDate(order.delivery_at)}</p>
                        </div>

                        {/* Order Status */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Status Pesanan</p>
                          <div className="text-sm">
                            {getStatusBadge(order.status)}
                          </div>
                        </div>

                        {/* Order Timestamps */}
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-2">Metadata</p>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p><span className="font-semibold">Created:</span> {formatDeliveryDate(order.created_at)}</p>
                            <p><span className="font-semibold">Updated:</span> {formatDeliveryDate(order.updated_at)}</p>
                          </div>
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
                                  {finishMutation.isPending ? 'Finishing...' : 'Finish Order'}
                                </button>
                                <button
                                  onClick={() => handleCancel(order.id)}
                                  disabled={cancelMutation.isPending}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-none"
                                >
                                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
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
    if (!dateString) return 'N/A';
    
    // Parse UTC date and convert to WIB (UTC+7)
    const utcDate = new Date(dateString);
    
    // Extract UTC components
    let dayNum = utcDate.getUTCDate();
    let monthNum = utcDate.getUTCMonth();
    let year = utcDate.getUTCFullYear();
    let dayOfWeek = utcDate.getUTCDay();
    let hours = utcDate.getUTCHours();
    const minutes = utcDate.getUTCMinutes();
    const seconds = utcDate.getUTCSeconds();
    
    // Add 7 hours for WIB timezone
    hours += 7;
    
    // Handle day overflow (if hours >= 24)
    if (hours >= 24) {
      hours -= 24;
      dayOfWeek = (dayOfWeek + 1) % 7; // Next day of week
      dayNum += 1;
      
      // Handle month/year overflow
      const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
      if (dayNum > daysInMonth) {
        dayNum = 1;
        monthNum += 1;
        if (monthNum > 11) {
          monthNum = 0;
          year += 1;
        }
      }
    }
    
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    
    if (language === 'id') {
      const daysID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthsID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${daysID[dayOfWeek]}, ${dayNum} ${monthsID[monthNum]} ${year} ${hoursStr}:${minutesStr}:${secondsStr}`;
    } else {
      const daysEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthsEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${daysEN[dayOfWeek]}, ${dayNum} ${monthsEN[monthNum]} ${year} ${hoursStr}:${minutesStr}:${secondsStr}`;
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
