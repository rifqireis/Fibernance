import React, { useState, useEffect } from 'react';
import { useAccounts, type Account } from '../api/accounts';
import { useCreateComboOrder } from '../api/orders';
import { useCashierStore } from '../store/cashierStore';
import { Badge, Button, Card, Input, Textarea, cn } from '../components/ui';

const cashierUnderlineInputClass =
  'h-auto border-0 border-b border-gray-300 bg-transparent px-0 py-2 focus:border-black focus:ring-0';

const parserPrimaryButtonClass = 'h-auto flex-1 py-2 text-sm';
const parserSecondaryButtonClass = 'h-auto px-4 py-2 text-sm';
const cashierPrimaryActionClass = 'h-auto w-full py-3 text-sm uppercase tracking-wide';

const getParserBadgeVariant = (type: 'idle' | 'success' | 'error' | 'partial') => {
  if (type === 'success') {
    return 'success' as const;
  }

  if (type === 'error') {
    return 'error' as const;
  }

  return 'neutral' as const;
};

type AccountCategoryKey = 'cukup' | 'minus';

const Cashier: React.FC = () => {
  const [parserText, setParserText] = useState('');
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserStatus, setParserStatus] = useState<{
    type: 'idle' | 'success' | 'error' | 'partial';
    message: string;
  }>({ type: 'idle', message: '' });
  const [orderId, setOrderId] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const { data: accounts, isLoading, error } = useAccounts();
  const {
    selectedAccounts,
    targetId,
    serverId,
    totalDiamond,
    buyerName,
    itemName,
    quantity,
    toggleAccountSelection,
    setTarget,
    setTotalDiamond,
    setBuyerName,
    setItemName,
    setQuantity,
    resetCashier,
  } = useCashierStore();

  const createOrderMutation = useCreateComboOrder();

  // Calculate remaining balance for selected accounts
  const calculateRemainingBalance = () => {
    if (!accounts || !accounts.length) return {};
    const balance: { [key: string]: number } = {};
    selectedAccounts.forEach((id) => {
      const account = accounts.find((acc) => String(acc.id) === id);
      if (account) {
        balance[id] = Math.max(0, account.real_diamond - totalDiamond);
      }
    });
    return balance;
  };

  const remainingBalance = calculateRemainingBalance();

  const handleTargetIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTarget(e.target.value, serverId);
  };

  const handleServerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTarget(targetId, e.target.value);
  };

  const handleTotalDiamondChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value) || 0;
    setTotalDiamond(value);
  };

  const handleBuyerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuyerName(e.target.value);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(value);
  };

  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setItemName(val);
    if (val.toLowerCase().includes('starlight')) {
      setTotalDiamond(300 * quantity);
    }
  };
  // Auto-calculate totalDiamond when quantity changes for Starlight items
  useEffect(() => {
    if (itemName.toLowerCase().includes('starlight')) {
      setTotalDiamond(300 * quantity);
    }
  }, [quantity, itemName, setTotalDiamond]);

  // Improved Itemku Parser Handler
  const handleParseButtonClick = () => {
    if (!parserText.trim()) {
      setParserStatus({
        type: 'error',
        message: 'Paste Itemku raw text before running the parser.',
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const rawText = parserText;

    // Parse semua data dulu ke variable temporary sebelum set ke store
    let parsedOrderId = '';
    let parsedItemName = '';
    let parsedUserId = '';
    let parsedZoneId = '';
    let parsedUsername = '';
    let parsedPurchaserName = '';

    // 0. Order ID: "OD000000154383657" (after "Nomor Pesanan")
    const orderIdMatch = rawText.match(/Nomor Pesanan[\s\n:]*([A-Z0-9]+)/i);
    if (orderIdMatch && orderIdMatch[1]) {
      parsedOrderId = orderIdMatch[1].trim();
      successCount++;
      console.log('Parsed order ID:', parsedOrderId);
    } else {
      errorCount++;
      console.warn('Order ID was not found in the parser input.');
    }

    // 1. Item name: text before "Lihat Dagangan"
    const itemNameMatch = rawText.match(/([^\n]+)\s*\nLihat Dagangan/i);
    if (itemNameMatch && itemNameMatch[1]) {
      parsedItemName = itemNameMatch[1].trim();
      successCount++;
      console.log('Parsed item name:', parsedItemName);
      if (parsedItemName.toLowerCase().includes('starlight')) {
        setTotalDiamond(300 * quantity);
      }
    } else {
      errorCount++;
      console.warn('Item name was not found in the parser input.');
    }

    // 2. User ID (target ID): after "User ID"
    const userIdMatch = rawText.match(/User\s+ID[\s\n]+(\d+)/i);
    if (userIdMatch && userIdMatch[1]) {
      parsedUserId = userIdMatch[1].trim();
      successCount++;
      console.log('Parsed user ID:', parsedUserId);
    } else {
      errorCount++;
      console.warn('User ID was not found in the parser input.');
    }

    // 3. Zone ID: after "Zone ID"
    const zoneIdMatch = rawText.match(/Zone\s+ID[\s\n]+(\d+)/i);
    if (zoneIdMatch && zoneIdMatch[1]) {
      parsedZoneId = zoneIdMatch[1].trim();
      successCount++;
      console.log('Parsed zone ID:', parsedZoneId);
    } else {
      errorCount++;
      console.warn('Zone ID was not found in the parser input.');
    }

    // 4. Username: after "Username"
    const usernameMatch = rawText.match(/Username[\s\n]+([^\n]+)/i);
    if (usernameMatch && usernameMatch[1]) {
      parsedUsername = usernameMatch[1].trim();
      successCount++;
      console.log('Parsed username:', parsedUsername);
    } else {
      errorCount++;
      console.warn('Username was not found in the parser input.');
    }

    // 5. Purchaser name: after "Pembeli"
    const purchaserMatch = rawText.match(/Pembeli[\s\n:]+([^\n]+)/i);
    if (purchaserMatch && purchaserMatch[1]) {
      parsedPurchaserName = purchaserMatch[1].trim();
      successCount++;
      console.log('Parsed purchaser name:', parsedPurchaserName);
    } else {
      errorCount++;
      console.warn('Purchaser name was not found in the parser input.');
    }

    // Set semua nilai ke store/state sekaligus (bukan terpisah)
    setOrderId(parsedOrderId);
    setItemName(parsedItemName);
    setTarget(parsedUserId, parsedZoneId);
    setBuyerName(parsedUsername);
    setPurchaserName(parsedPurchaserName);

    // Set status feedback
    if (successCount === 6) {
      setParserStatus({
        type: 'success',
        message: 'Parser completed. All 6 fields were extracted successfully.',
      });
    } else if (successCount > 0) {
      setParserStatus({
        type: 'partial',
        message: `Parser completed with partial results. ${successCount}/6 fields were extracted and ${errorCount} were missing.`,
      });
    } else {
      setParserStatus({
        type: 'error',
        message: 'Parser failed. No supported fields were extracted. Check the Itemku text format.',
      });
    }
  };

  const handleProcessOrder = async () => {
    if (selectedAccounts.length === 0) {
      alert('Please select at least one account');
      return;
    }

    if (!targetId.trim()) {
      alert('Please enter Target ID');
      return;
    }

    if (!serverId.trim()) {
      alert('Please enter Target Server');
      return;
    }

    if (totalDiamond <= 0) {
      alert('Total Diamond must be greater than 0');
      return;
    }

    if (!buyerName.trim()) {
      alert('Please enter Target Nickname');
      return;
    }

    if (!itemName.trim()) {
      alert('Please enter Item Name');
      return;
    }

    try {
      const accountIds = selectedAccounts.map((id) => parseInt(id));

      await createOrderMutation.mutateAsync({
        order_id: orderId,
        target_id: targetId,
        server_id: serverId,
        total_diamond: totalDiamond,
        selected_account_ids: accountIds,
        buyer_name: buyerName,
        item_name: itemName,
        quantity: quantity,
        // created_at omitted - backend uses datetime.now() for WIB timezone
      });

      alert('Order processed successfully.');
      resetCashier();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Unknown error occurred';
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-6 lg:px-8 lg:py-12">
        <h1 className="text-2xl lg:text-4xl font-serif font-semibold text-black">
          Cashier
        </h1>
        <p className="mt-2 text-sm text-gray-600 font-sans">
          Create combo orders and manage account deductions
        </p>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-200px)]">
        {/* Left Column - Form */}
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto p-4 lg:p-8">
          <div className="flex flex-col h-full justify-between">
            {/* Form Section */}
            <div>
              <h2 className="text-xl font-serif font-semibold text-black mb-8">
                Order Details
              </h2>

              {/* Itemku Parser - Collapsible */}
              <Card className="mb-8 border-gray-200 p-0">
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => setIsParserOpen(!isParserOpen)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-black font-sans">
                      Itemku Parser
                    </span>
                    {parserStatus.type === 'success' && (
                      <Badge variant="success">
                        Success
                      </Badge>
                    )}
                    {parserStatus.type === 'partial' && (
                      <Badge variant="neutral">
                        Partial
                      </Badge>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      isParserOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>

                {/* Collapsible Content */}
                {isParserOpen && (
                  <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                    <Textarea
                      value={parserText}
                      onChange={(e) => setParserText(e.target.value)}
                      placeholder="Paste Itemku raw text here..."
                      className="h-20 resize-none"
                    />

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleParseButtonClick}
                        className={parserPrimaryButtonClass}
                      >
                        Parse Text
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setParserText('');
                          setParserStatus({ type: 'idle', message: '' });
                        }}
                        variant="secondary"
                        className={parserSecondaryButtonClass}
                      >
                        Clear
                      </Button>
                    </div>

                    {/* Parser Status Message */}
                    {parserStatus.type !== 'idle' && (
                      <Card className="border-gray-200 bg-gray-50 p-3 text-xs text-black">
                        <Badge variant={getParserBadgeVariant(parserStatus.type)} className="text-[10px]">
                          {parserStatus.type}
                        </Badge>
                        <p className="mt-3">{parserStatus.message}</p>
                      </Card>
                    )}

                    <p className="text-xs text-gray-500 font-sans">
                      Extract order ID, item name, user ID, zone ID, username, and purchaser name from raw Itemku text.
                    </p>
                  </div>
                )}
              </Card>

              {/* GROUP 1: Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Order ID Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Order ID
                  </label>
                  <Input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g., OD0000001"
                    className={cashierUnderlineInputClass}
                  />
                </div>

                {/* Item Name Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Item Name
                  </label>
                  <Input
                    type="text"
                    value={itemName}
                    onChange={handleItemNameChange}
                    placeholder="e.g., Starlight Card"
                    className={cashierUnderlineInputClass}
                  />
                </div>
              </div>

              {/* GROUP 2: Target Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Target ID Input (Game ID) */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Target ID
                  </label>
                  <Input
                    type="text"
                    value={targetId}
                    onChange={handleTargetIdChange}
                    placeholder="Game ID"
                    className={cashierUnderlineInputClass}
                  />
                </div>

                {/* Zone Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Zone
                  </label>
                  <Input
                    type="text"
                    value={serverId}
                    onChange={handleServerIdChange}
                    placeholder="Zone ID"
                    className={cashierUnderlineInputClass}
                  />
                </div>
              </div>

              {/* GROUP 3: Name Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Target Nickname Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Target Nickname
                  </label>
                  <Input
                    type="text"
                    value={buyerName}
                    onChange={handleBuyerNameChange}
                    placeholder="Player nick"
                    className={cashierUnderlineInputClass}
                  />
                </div>

                {/* Purchaser Name Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Purchaser Name
                  </label>
                  <Input
                    type="text"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    placeholder="Buyer name"
                    className={cashierUnderlineInputClass}
                  />
                </div>
              </div>

              {/* GROUP 4: Quantity & Diamond */}
              <div className="grid grid-cols-2 gap-4 mb-12">
                {/* Jumlah Pesanan (QTY) Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    QTY
                  </label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    placeholder="1"
                    min="1"
                    className={cashierUnderlineInputClass}
                  />
                </div>

                {/* Total Diamond Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Total Diamond
                  </label>
                  <Input
                    type="number"
                    value={totalDiamond}
                    onChange={handleTotalDiamondChange}
                    placeholder="0"
                    min="0"
                    className={cashierUnderlineInputClass}
                  />
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="border-t border-gray-200 pt-8">
              {/* Total Diamond Display */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-600 font-sans uppercase tracking-wide mb-2">
                  Total Order
                </p>
                <p className="text-4xl lg:text-6xl font-serif font-semibold text-black">
                  {totalDiamond.toLocaleString()}
                </p>
              </div>

              {/* Selected Accounts Summary */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-600 font-sans uppercase tracking-wide mb-2">
                  Accounts ({selectedAccounts.length})
                </p>
                {selectedAccounts.length > 0 ? (
                  <div className="space-y-1">
                    {selectedAccounts.map((id) => {
                      const account = accounts?.find(
                        (acc) => String(acc.id) === id
                      );
                      return (
                        <p key={id} className="text-sm text-charcoal font-sans">
                          • {account?.name || id}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-sans italic">
                    No accounts selected
                  </p>
                )}
              </div>

              {/* Process Button */}
              <Button
                onClick={handleProcessOrder}
                disabled={
                  createOrderMutation.isPending ||
                  selectedAccounts.length === 0 ||
                  !targetId.trim() ||
                  !serverId.trim() ||
                  !buyerName.trim() ||
                  !itemName.trim() ||
                  totalDiamond <= 0
                }
                className={cashierPrimaryActionClass}
              >
                {createOrderMutation.isPending
                  ? 'PROCESSING...'
                  : 'PROCESS ORDER'}
              </Button>

              {/* Error Message */}
              {createOrderMutation.isError && (
                <p className="mt-4 text-xs text-red-600 font-sans text-center">
                  Error:{' '}
                  {(createOrderMutation.error as any)?.response?.data
                    ?.detail ||
                    'Unknown error occurred'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Account List */}
        <div className="w-full lg:w-1/2 border-l-0 lg:border-l border-gray-200 overflow-y-auto p-4 lg:p-8">
          <div>
            <h2 className="text-xl font-serif font-semibold text-black mb-6">
              Select Accounts
            </h2>

            {isLoading && (
              <p className="text-sm text-gray-600 font-sans">
                Loading accounts...
              </p>
            )}

            {error && (
              <p className="text-sm text-red-600 font-sans">
                Error loading accounts: {error.message}
              </p>
            )}

            {accounts && accounts.length > 0 ? (
              <AccountListByCategory
                accounts={accounts}
                selectedAccounts={selectedAccounts}
                remainingBalance={remainingBalance}
                totalDiamond={totalDiamond}
                onToggle={(id) => toggleAccountSelection(String(id))}
              />
            ) : (
              <p className="text-sm text-gray-600 font-sans">
                No accounts available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AccountCheckboxItemProps {
  account: Account;
  isSelected: boolean;
  remainingBalance?: number;
  category?: AccountCategoryKey;
  totalDiamond?: number;
  onToggle: () => void;
}

interface AccountListByCategoryProps {
  accounts: Account[];
  selectedAccounts: string[];
  remainingBalance: { [key: string]: number };
  totalDiamond: number;
  onToggle: (id: number) => void;
}

const AccountListByCategory: React.FC<AccountListByCategoryProps> = ({
  accounts,
  selectedAccounts,
  remainingBalance,
  totalDiamond,
  onToggle,
}) => {
  // Categorize accounts
  const sufficientStock = accounts.filter(
    (acc) => acc.real_diamond >= totalDiamond
  );
  const requiresRestock = accounts.filter(
    (acc) => acc.real_diamond < totalDiamond
  );

  const renderCategory = (
    title: string,
    accountList: Account[],
    categoryKey: AccountCategoryKey
  ) => {
    if (accountList.length === 0) return null;

    return (
      <div key={categoryKey} className="mb-8">
        {/* Category Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-400">
          <h3 className="text-sm font-serif font-bold text-black uppercase tracking-wide">
            {title}
          </h3>
          <Badge variant="neutral" className="px-2 py-1 tracking-normal">
            {accountList.length}
          </Badge>
        </div>

        {/* Accounts in this category */}
        <div className="space-y-4">
          {accountList.map((account) => (
            <AccountCheckboxItem
              key={account.id}
              account={account}
              isSelected={selectedAccounts.includes(String(account.id))}
              remainingBalance={remainingBalance[String(account.id)]}
              category={categoryKey}
              totalDiamond={totalDiamond}
              onToggle={() => onToggle(account.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderCategory('Sufficient Stock', sufficientStock, 'cukup')}
      {renderCategory('Requires Restock', requiresRestock, 'minus')}
    </div>
  );
};

const AccountCheckboxItem: React.FC<AccountCheckboxItemProps> = ({
  account,
  isSelected,
  remainingBalance,
  category,
  totalDiamond,
  onToggle,
}) => {
  const projectedDeficit = totalDiamond
    ? Math.max(0, totalDiamond - account.real_diamond)
    : 0;

  return (
    <Card
      onClick={onToggle}
      className={cn('flex cursor-pointer items-start gap-4 border-gray-300 p-4 transition-colors',
        category === 'cukup'
          ? 'bg-white hover:bg-gray-50'
          : 'bg-gray-50 hover:bg-gray-100')}
    >
      {/* Custom Checkbox */}
      <div
        className={`w-5 h-5 mt-1 border border-gray-300 rounded-none flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? 'bg-black border-black' : 'bg-white border-gray-300'
        }`}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Account Info */}
      <div className="flex-1">
        <p className="text-sm font-sans font-semibold text-black">
          {account.name}
        </p>
        <p className="text-xs text-gray-600 font-sans mt-1">
          {account.game_id} ({account.zone})
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-3">
            <p className="text-sm font-serif font-semibold text-black">
              {account.real_diamond.toLocaleString()}
            </p>
            <span className="text-xs text-gray-500 font-sans">current</span>
          </div>

          {category === 'minus' && projectedDeficit > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-serif font-semibold text-gray-800">
                {projectedDeficit.toLocaleString()}
              </p>
              <span className="text-xs text-gray-500 font-sans">projected deficit</span>
            </div>
          )}

          {account.deficit_diamond > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-serif font-semibold text-gray-800">
                {account.deficit_diamond.toLocaleString()}
              </p>
              <span className="text-xs text-gray-500 font-sans">current deficit</span>
            </div>
          )}

          {isSelected && remainingBalance !== undefined && (
            <div className="flex items-center gap-3">
              <p
                className={`text-sm font-serif font-semibold ${
                  remainingBalance >= 0 ? 'text-black' : 'text-gray-700'
                }`}
              >
                {remainingBalance.toLocaleString()}
              </p>
              <span className="text-xs text-gray-500 font-sans">remaining</span>
            </div>
          )}
        </div>
        {!account.is_active && (
          <p className="text-xs text-gray-500 font-sans mt-2">Inactive</p>
        )}
      </div>
    </Card>
  );
};

export default Cashier;
