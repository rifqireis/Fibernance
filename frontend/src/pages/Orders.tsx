import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCancelOrder } from '../api/orders';
import { getOrders, ComboOrderResponse, finishOrder } from '../api/orders';
import { Badge, Button, Card, FileTrigger, Input, Modal, Select, cn } from '../components/ui';

const ordersTabButtonClass =
  'h-auto border-b-2 border-x-0 border-t-0 px-6 py-4 text-sm font-semibold uppercase tracking-wide focus:ring-0 focus:ring-offset-0';

const actionButtonClass = 'h-auto px-3 py-1.5 text-xs font-semibold uppercase tracking-wide';

const modalToggleButtonClass = 'h-auto px-3 py-1 text-xs font-semibold uppercase tracking-wide';

const modalHeaderButtonClass = 'h-auto px-3 py-2 text-xs uppercase tracking-wide';

const Orders: React.FC = () => {
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(0, 100),
  });

  const cancelMutation = useCancelOrder();
  const [selectedOrder, setSelectedOrder] = useState<ComboOrderResponse | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [videoUploadOrder, setVideoUploadOrder] = useState<ComboOrderResponse | null>(null);
  const [showDeliveryNotification, setShowDeliveryNotification] = useState(false);
  const [deliveryNotificationOrder, setDeliveryNotificationOrder] = useState<ComboOrderResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'item' | 'diamond'>('date-desc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [, setUpdateTrigger] = useState(0); // Trigger re-render untuk countdown update

  const handleFinish = async (order: ComboOrderResponse) => {
    setVideoUploadOrder(order);
    setShowVideoUpload(true);
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

  const handleFinishPrint = (order: ComboOrderResponse) => {
    setDeliveryNotificationOrder(order);
    setShowDeliveryNotification(true);
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

  // Format datetime - backend sends naive ISO datetime in WIB format (no conversion needed)
  const formatDateTimeInWIB = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    // Backend sends naive ISO datetime string in WIB format (e.g., "2026-04-04T15:00:00")
    // Parse directly using local date parsing (no UTC conversion)
    const date = new Date(dateString);
    
    // Extract components - already in correct WIB time
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    
    // No timezone adjustment needed - backend already sends WIB
    
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
    if (status === 'DONE') {
      return <Badge variant="success">Done</Badge>;
    } else if (status === 'CANCELLED') {
      return <Badge variant="error">Cancelled</Badge>;
    } else {
      return <Badge variant="neutral">Pending</Badge>;
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
        return sorted.sort((a, b) => new Date(b.actual_delivery_at).getTime() - new Date(a.actual_delivery_at).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.actual_delivery_at).getTime() - new Date(b.actual_delivery_at).getTime());
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
            <Input
              type="text"
              placeholder="Search by invoice, player ID, buyer, username, or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4"
            />
            {searchTerm && (
              <p className="mt-1 text-xs text-gray-600">
                Showing <span className="font-semibold">{filteredAndSortedOrders.length}</span> matching orders
              </p>
            )}
          </div>

          <div className="flex gap-2 items-center lg:flex-shrink-0">
            <label className="text-xs font-semibold text-charcoal uppercase tracking-wide whitespace-nowrap">
              Sort:
            </label>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3"
            >
              <option value="date-desc">Delivery Date (Newest)</option>
              <option value="date-asc">Delivery Date (Soonest)</option>
              <option value="item">Item Name (A-Z)</option>
              <option value="diamond">Total Diamond</option>
            </Select>

            {/* Sort Direction Icon */}
            {sortBy === 'diamond' && (
              <Button
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                variant="secondary"
                className="h-10 w-10 p-0"
                title={sortDirection === 'desc' ? 'Largest to Smallest' : 'Smallest to Largest'}
                aria-label={sortDirection === 'desc' ? 'Sort largest to smallest' : 'Sort smallest to largest'}
              >
                <svg className={`w-4 h-4 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="3" y1="5" x2="21" y2="5" strokeWidth="2" strokeLinecap="round" />
                  <line x1="5" y1="11" x2="19" y2="11" strokeWidth="2" strokeLinecap="round" />
                  <line x1="9" y1="17" x2="15" y2="17" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Button>
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
            <p className="text-sm text-gray-600 font-sans">No orders match the current search.</p>
          </div>
        )}

        {filteredAndSortedOrders && filteredAndSortedOrders.length > 0 && (
          <div>
            {/* Filter Tabs */}
            <div className="mb-6 flex items-center gap-0 border-b border-gray-200">
              <Button
                onClick={() => setActiveTab('active')}
                variant="ghost"
                className={cn(
                  ordersTabButtonClass,
                  activeTab === 'active'
                    ? 'border-black text-black hover:border-black hover:bg-transparent'
                    : 'border-transparent text-gray-600 hover:border-transparent hover:bg-transparent hover:text-black',
                )}
              >
                Active Orders ({filteredAndSortedOrders.filter((o) => o.status === 'PENDING').length})
              </Button>
              <Button
                onClick={() => setActiveTab('history')}
                variant="ghost"
                className={cn(
                  ordersTabButtonClass,
                  activeTab === 'history'
                    ? 'border-black text-black hover:border-black hover:bg-transparent'
                    : 'border-transparent text-gray-600 hover:border-transparent hover:bg-transparent hover:text-black',
                )}
              >
                History ({filteredAndSortedOrders.filter((o) => o.status !== 'PENDING').length})
              </Button>
            </div>

            {/* Desktop: Table View */}
            <Card className="hidden overflow-x-auto border-gray-200 pb-4 p-0 md:block">
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
                              <Button
                                onClick={() => handleFinish(order)}
                                disabled={false}
                                className={actionButtonClass}
                              >
                                Finish
                              </Button>
                            )}

                            {/* Cancel Button - Only show for PENDING */}
                            {order.status === 'PENDING' && (
                              <Button
                                onClick={() => handleCancel(order.id)}
                                disabled={cancelMutation.isPending}
                                variant="danger"
                                className={actionButtonClass}
                              >
                                {cancelMutation.isPending ? 'Cancelling' : 'Cancel'}
                              </Button>
                            )}

                            {/* Print Button - Always show */}
                            <Button
                              onClick={() => handlePrint(order)}
                              variant="secondary"
                              className={actionButtonClass}
                            >
                              Print
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>

            {/* Mobile: Compact Expandable Cards */}
            <div className="md:hidden space-y-3">
              {filteredAndSortedOrders
                .filter((order) =>
                  activeTab === 'active'
                    ? order.status === 'PENDING'
                    : order.status !== 'PENDING'
                )
                .map((order) => (
                  <Card key={order.id} className="overflow-hidden border-gray-200 p-0">
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
                              {calculateCountdown(order.actual_delivery_at)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Buyer | Game ID & Zone */}
                      <div className="flex justify-between gap-2 text-xs text-gray-700">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="font-semibold">Buyer:</span> {order.buyer_name}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="font-semibold">ID:</span> {order.target_id}
                          {order.game_username && (
                            <div className="text-xs">@{order.game_username}</div>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Sending Accounts */}
                      {order.sending_accounts && Object.keys(order.sending_accounts).length > 0 && (
                        <div className="text-xs text-gray-700 truncate">
                          <span className="font-semibold">Accounts:</span>{' '}
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

                      {/* Row 4: Delivery Time */}
                      <div className="text-xs text-gray-600">
                        {formatDeliveryDate(order.actual_delivery_at)}
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
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Order Item</p>
                          <p className="text-sm text-black">{order.quantity}x {order.item_name || 'N/A'}</p>
                        </div>

                        {/* Buyer Name */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Buyer Name</p>
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
                          <p className="text-sm text-black font-semibold">{order.total_diamond.toLocaleString()}</p>
                        </div>

                        {/* Processing Accounts - Full Details */}
                        {order.sending_accounts && Object.keys(order.sending_accounts).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Sending Accounts</p>
                            <div className="text-sm text-black space-y-1">
                              {Object.entries(order.sending_accounts).map(([accountId, accountData]: [string, any]) => {
                                const accountName = typeof accountData === 'object' && accountData.name ? accountData.name : accountData;
                                const deduction = order.deduction_breakdown[accountId] || 0;
                                return (
                                  <Card key={accountId} className="flex items-center justify-between border-gray-200 p-2">
                                    <span className="font-semibold">{accountName}</span>
                                    <span className="text-gray-600">{deduction.toLocaleString()}</span>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Delivery Information */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Delivery Window</p>
                          <p className="text-sm text-black">{formatDeliveryDate(order.actual_delivery_at)}</p>
                        </div>

                        {/* Order Status */}
                        <div>
                          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Order Status</p>
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
                                <Button
                                  onClick={() => handleFinish(order)}
                                  disabled={false}
                                  className="h-auto flex-1 px-3 py-2 text-xs uppercase tracking-wide"
                                >
                                  Finish Order
                                </Button>
                                <Button
                                  onClick={() => handleCancel(order.id)}
                                  disabled={cancelMutation.isPending}
                                  variant="danger"
                                  className="h-auto flex-1 px-3 py-2 text-xs uppercase tracking-wide"
                                >
                                  {cancelMutation.isPending ? 'Cancelling' : 'Cancel Order'}
                                </Button>
                              </>
                            )}
                            {order.status === 'DONE' && (
                              <Button
                                onClick={() => handleFinishPrint(order)}
                                className="h-auto flex-1 px-3 py-2 text-xs uppercase tracking-wide"
                              >
                                Delivery Notice
                              </Button>
                            )}
                            <Button
                              onClick={() => handlePrint(order)}
                              variant="secondary"
                              className="h-auto flex-1 px-3 py-2 text-xs uppercase tracking-wide"
                            >
                              Print
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Delivery Notification Modal */}
      {showDeliveryNotification && deliveryNotificationOrder && (
        <DeliveryNotificationModal
          order={deliveryNotificationOrder}
          onClose={() => {
            setShowDeliveryNotification(false);
            setDeliveryNotificationOrder(null);
          }}
        />
      )}

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

      {/* Video Upload Modal */}
      {showVideoUpload && videoUploadOrder && (
        <VideoUploadModal
          order={videoUploadOrder}
          onClose={() => {
            setShowVideoUpload(false);
            setVideoUploadOrder(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

/**
 * Delivery Notification Modal Component
 * Displays pre-filled delivery notification message with copy and close buttons
 */
interface DeliveryNotificationModalProps {
  order: ComboOrderResponse;
  onClose: () => void;
}

const DeliveryNotificationModal: React.FC<DeliveryNotificationModalProps> = ({ order, onClose }) => {
  const [language, setLanguage] = React.useState<'id' | 'en'>('en');

  // Format date only (no time) for delivery notifications
  // ID: DD/MM/YYYY
  // EN: MM/DD/YYYY
  const formatDeliveryDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    let day = date.getDate();
    let month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    
    if (language === 'id') {
      return `${dayStr}/${monthStr}/${year}`;
    } else {
      return `${monthStr}/${dayStr}/${year}`;
    }
  };

  // Generate delivery notification text with template variables
  const generateDeliveryNotification = (): string => {
    const item = `${order.quantity}x ${order.item_name}`;
    const buyer = order.buyer_name;
    const date = formatDeliveryDateOnly(order.delivery_at);
    
    if (language === 'id') {
      return `Pesanan ${item} sudah dikirim. Terima kasih, ${buyer}.\n${date}`;
    } else {
      return `Order ${item} has been sent. Thank you, ${buyer}.\n${date}`;
    }
  };

  const notificationText = generateDeliveryNotification();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(notificationText);
      alert('Message copied.');
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Failed to copy message.');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      className="max-h-[90vh] max-w-sm overflow-y-auto border-gray-200"
      contentClassName="p-0"
      showCloseButton={false}
    >
      <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-lg font-serif font-semibold text-black">Delivery Notice</h2>
        <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
          <Button
            onClick={() => setLanguage('id')}
            variant={language === 'id' ? 'primary' : 'secondary'}
            className={modalToggleButtonClass}
          >
            ID
          </Button>
          <Button
            onClick={() => setLanguage('en')}
            variant={language === 'en' ? 'primary' : 'secondary'}
            className={modalToggleButtonClass}
          >
            EN
          </Button>
        </div>
        <Button onClick={onClose} variant="secondary" className={modalHeaderButtonClass}>
          Close
        </Button>
      </div>

      <div className="space-y-4 p-6">
        <Card className="border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Order</p>
          <p className="text-sm font-semibold text-black">{order.invoice_ref}</p>
          <p className="text-sm text-gray-700">{order.quantity}x {order.item_name}</p>
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">Notification Message</label>
          <Card className="border-gray-300 p-4">
            <p
              className="whitespace-pre-wrap font-mono text-sm text-black"
              style={{ lineHeight: '1.6' }}
            >
              {notificationText}
            </p>
          </Card>
        </div>

        <Card className="border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <p>Copy the message and send it through your preferred delivery channel.</p>
          <p className="mt-1">The language toggle changes the generated customer-facing text, not the modal UI.</p>
        </Card>
      </div>

      <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
        <Button onClick={handleCopyText} className="flex-1">
          Copy
        </Button>
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Close
        </Button>
      </div>
    </Modal>
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
  const [language, setLanguage] = React.useState<'id' | 'en'>('en');
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Determine mode: INVOICE for PENDING, RECEIPT for DONE/CANCELLED
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

  // Format date for receipt - compact format
  // ID: DD/M/YYYY, HH.mm WIB (WIB time)
  const formatDateForReceipt = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}.${minutes} WIB`;
  };

  // Format date for receipt EN - compact format
  // EN: M/DD/YYYY, HH.mm UTC (UTC time)
  const formatDateForReceiptEN = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    // Parse as UTC date (backend sends UTC)
    const utcDate = new Date(dateString);
    
    // For UTC, use UTC components directly
    let day = utcDate.getUTCDate();
    let month = utcDate.getUTCMonth() + 1;
    let year = utcDate.getUTCFullYear();
    let hours = utcDate.getUTCHours();
    const minutes = utcDate.getUTCMinutes();
    
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    
    return `${month}/${day}/${year}, ${hoursStr}.${minutesStr} UTC`;
  };

  // Convert WIB datetime to UTC format for receipt display
  // Backend sends naive ISO datetime in WIB (e.g., "2026-04-05T15:00:00")
  // Convert to UTC by subtracting 7 hours
  const formatDateUTC = (wibDateString: string | undefined): string => {
    if (!wibDateString) return 'N/A';
    
    // Parse WIB datetime (naive, treat as local)
    const wibDate = new Date(wibDateString);
    
    // Extract WIB components
    let dayNum = wibDate.getDate();
    let monthNum = wibDate.getMonth();
    let year = wibDate.getFullYear();
    let dayOfWeek = wibDate.getDay();
    let hours = wibDate.getHours();
    const minutes = wibDate.getMinutes();
    const seconds = wibDate.getSeconds();
    
    // Convert WIB to UTC by subtracting 7 hours
    hours -= 7;
    
    // Handle day underflow (if hours < 0)
    if (hours < 0) {
      hours += 24;
      dayOfWeek = (dayOfWeek - 1 + 7) % 7; // Previous day of week
      dayNum -= 1;
      
      // Handle month/year underflow
      if (dayNum < 1) {
        monthNum -= 1;
        if (monthNum < 0) {
          monthNum = 11;
          year -= 1;
        }
        dayNum = new Date(year, monthNum + 1, 0).getDate();
      }
    }
    
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    
    if (language === 'id') {
      const daysID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthsID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${daysID[dayOfWeek]}, ${dayNum} ${monthsID[monthNum]} ${year} ${hoursStr}:${minutesStr}:${secondsStr} UTC`;
    } else {
      const daysEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthsEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${daysEN[dayOfWeek]}, ${dayNum} ${monthsEN[monthNum]} ${year} ${hoursStr}:${minutesStr}:${secondsStr} UTC`;
    }
  };

  // Format date only (no time) for delivery notifications
  // ID: DD/MM/YYYY
  // EN: MM/DD/YYYY
  const formatDeliveryDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    let day = date.getDate();
    let month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    
    if (language === 'id') {
      return `${dayStr}/${monthStr}/${year}`;
    } else {
      return `${monthStr}/${dayStr}/${year}`;
    }
  };

  // Generate delivery notification text with template variables
  const generateDeliveryNotification = (orderData: ComboOrderResponse): string => {
    const item = `${orderData.quantity}x ${orderData.item_name}`;
    const buyer = orderData.buyer_name;
    const date = formatDeliveryDateOnly(orderData.delivery_at);
    
    if (language === 'id') {
      return `Pesanan ${item} sudah dikirim. Terima kasih, ${buyer}.\n${date}`;
    } else {
      return `Order ${item} has been sent. Thank you, ${buyer}.\n${date}`;
    }
  };

  const getReceiptText = (): string => {
    const divider = '==============================';
    
    // Build sender info with numbering for multiple accounts
    const senderEntries = Object.entries(order.sending_accounts);
    const senderInfoLines = senderEntries.map((entry, index) => {
      const accountData = entry[1] as { name: string; game_id: string; zone: string; deduction: number };
      const accountName = accountData.name;
      const gameId = accountData.game_id || 'N/A';
      const zone = accountData.zone || 'N/A';
      const lineNum = index + 1;
      
      return `${lineNum}. Nick : ${accountName}\n   Id     : ${gameId} (${zone})`;
    }).join('\n');

    if (language === 'id') {
      return `${divider}
      DETAIL PESANAN
${divider}

DATA PESANAN
No.       : ${order.invoice_ref}
Item      : ${order.quantity}x ${order.item_name || 'N/A'}
Target    : ${order.target_id} (${order.server_id})
Tgl kirim : ${formatDateForReceipt(order.delivery_at)}

INFO PENGIRIM
${senderInfoLines}

${divider}
PENTING:
Silakan tambahkan akun diatas sebagai teman (add friend).
${divider}`;
    } else {
      return `${divider}
      ORDER DETAILS
${divider}

ORDER DATA
No.       : ${order.invoice_ref}
Item      : ${order.quantity}x ${order.item_name || 'N/A'}
Target    : ${order.target_id} (${order.server_id})
Ship date : ${formatDateForReceiptEN(order.delivery_at)}

SENDER INFO
${senderInfoLines}

${divider}
IMPORTANT:
Please add the accounts above
as friends to deliver gifts.
${divider}`;
    }
  };

  const receiptText = getReceiptText();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      alert('Receipt text copied.');
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Failed to copy text.');
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
    <Modal
      open
      onClose={onClose}
      className="max-h-[90vh] max-w-sm overflow-y-auto border-gray-200"
      contentClassName="p-0"
      showCloseButton={false}
    >
      <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-serif font-semibold text-black">
            {mode === 'invoice' ? 'INVOICE' : 'RECEIPT'}
          </h2>
          <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
            <Button
              onClick={() => setLanguage('id')}
              variant={language === 'id' ? 'primary' : 'secondary'}
              className={modalToggleButtonClass}
            >
              ID
            </Button>
            <Button
              onClick={() => setLanguage('en')}
              variant={language === 'en' ? 'primary' : 'secondary'}
              className={modalToggleButtonClass}
            >
              EN
            </Button>
          </div>
        </div>
        <Button onClick={onClose} variant="secondary" className={modalHeaderButtonClass}>
          Close
        </Button>
      </div>

      <div className="p-6">
        <div
          ref={receiptRef}
          className="whitespace-pre-wrap font-mono text-xs text-black"
          style={{ fontFamily: 'Courier New, monospace', lineHeight: '1.6' }}
        >
          {receiptText}
        </div>
      </div>

      <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
        <Button onClick={handleCopyText} variant="secondary" className="flex-1">
          Copy Text
        </Button>
        <Button onClick={handlePrint} className="flex-1">
          Print
        </Button>
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Close
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Video Upload Modal Component
 * Allows user to upload proof video for order delivery
 */
interface VideoUploadModalProps {
  order: ComboOrderResponse;
  onClose: () => void;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ order, onClose }) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('Video file must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const response = await finishOrder(order.id, selectedFile);
      setSuccess(true);
      
      // Show success message for 2 seconds then close
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      open
      onClose={isUploading ? undefined : onClose}
      className="max-h-screen max-w-md overflow-y-auto border-gray-200"
      contentClassName="p-0"
      showCloseButton={false}
      closeOnOverlayClick={!isUploading}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-6">
        <h2 className="text-lg font-serif font-semibold text-black">Upload Delivery Video</h2>
        <Button
          onClick={onClose}
          disabled={isUploading}
          variant="secondary"
          className={modalHeaderButtonClass}
        >
          Close
        </Button>
      </div>

      <div className="space-y-4 p-6">
        <Card className="border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Order</p>
          <p className="text-sm font-semibold text-black">{order.invoice_ref}</p>
          <p className="text-sm text-gray-700">{order.quantity}x {order.item_name}</p>
        </Card>

        {success && (
          <Card className="border-green-200 bg-green-50 px-4 py-3">
            <Badge variant="success">Uploaded</Badge>
            <p className="mt-3 text-sm font-semibold text-green-800">Video uploaded successfully.</p>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 px-4 py-3">
            <Badge variant="error">Upload Error</Badge>
            <p className="mt-3 text-sm font-semibold text-red-800">{error}</p>
          </Card>
        )}

        {!success && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                Select Video File (Max 50 MB)
              </label>
              <div className="flex items-center gap-2">
                <FileTrigger
                  ref={fileInputRef}
                  accept="video/*"
                  onFileChange={handleFileSelect}
                  disabled={isUploading}
                  buttonLabel={selectedFile ? selectedFile.name : 'Select File'}
                />
              </div>
            </div>

            {selectedFile && (
              <Card className="space-y-1 border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-gray-700">Selected File</p>
                <p className="text-sm text-black">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </Card>
            )}

            <Card className="space-y-1 border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <p>Accepted formats: MP4, MOV, AVI, and other standard video files.</p>
              <p>Maximum upload size: 50 MB.</p>
              <p>The video will be uploaded to the Telegram delivery channel.</p>
            </Card>
          </>
        )}
      </div>

      <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
        <Button
          onClick={onClose}
          disabled={isUploading}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || success}
          className="flex-1"
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </div>
    </Modal>
  );
};

export default Orders;
