import React, { useState, useEffect } from 'react';
import { useAccounts } from '../api/accounts';
import { useCreateComboOrder } from '../api/orders';
import { useCashierStore } from '../store/cashierStore';

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
        balance[id] = Math.max(0, account.stock_diamond - totalDiamond);
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
        message: '❌ Paste raw Itemku text terlebih dahulu!',
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

    // 0. Order ID: "OD000000154383657" (setelah "Nomor Pesanan")
    const orderIdMatch = rawText.match(/Nomor Pesanan[\s\n:]*([A-Z0-9]+)/i);
    if (orderIdMatch && orderIdMatch[1]) {
      parsedOrderId = orderIdMatch[1].trim();
      successCount++;
      console.log('✓ Order ID:', parsedOrderId);
    } else {
      errorCount++;
      console.warn('✗ Order ID tidak ditemukan');
    }

    // 1. Item Name: "Starlight Card" (sebelum "Lihat Dagangan")
    const itemNameMatch = rawText.match(/([^\n]+)\s*\nLihat Dagangan/i);
    if (itemNameMatch && itemNameMatch[1]) {
      parsedItemName = itemNameMatch[1].trim();
      successCount++;
      console.log('✓ Item Name:', parsedItemName);
      // Auto-calc Starlight with quantity
      if (parsedItemName.toLowerCase().includes('starlight')) {
        setTotalDiamond(300 * quantity);
      }
    } else {
      errorCount++;
      console.warn('✗ Item Name tidak ditemukan');
    }

    // 2. User ID (Target ID): Setelah "User ID" + newline/spaces + digits
    const userIdMatch = rawText.match(/User\s+ID[\s\n]+(\d+)/i);
    if (userIdMatch && userIdMatch[1]) {
      parsedUserId = userIdMatch[1].trim();
      successCount++;
      console.log('✓ User ID:', parsedUserId);
    } else {
      errorCount++;
      console.warn('✗ User ID tidak ditemukan');
    }

    // 3. Zone ID: Setelah "Zone ID" baris baru
    const zoneIdMatch = rawText.match(/Zone\s+ID[\s\n]+(\d+)/i);
    if (zoneIdMatch && zoneIdMatch[1]) {
      parsedZoneId = zoneIdMatch[1].trim();
      successCount++;
      console.log('✓ Zone ID:', parsedZoneId);
    } else {
      errorCount++;
      console.warn('✗ Zone ID tidak ditemukan');
    }

    // 4. Username: Setelah "Username" baris baru
    const usernameMatch = rawText.match(/Username[\s\n]+([^\n]+)/i);
    if (usernameMatch && usernameMatch[1]) {
      parsedUsername = usernameMatch[1].trim();
      successCount++;
      console.log('✓ Username:', parsedUsername);
    } else {
      errorCount++;
      console.warn('✗ Username tidak ditemukan');
    }

    // 5. Nama Pembeli: Setelah "Pembeli:" newline/spaces
    const purchaserMatch = rawText.match(/Pembeli[\s\n:]+([^\n]+)/i);
    if (purchaserMatch && purchaserMatch[1]) {
      parsedPurchaserName = purchaserMatch[1].trim();
      successCount++;
      console.log('✓ Nama Pembeli:', parsedPurchaserName);
    } else {
      errorCount++;
      console.warn('✗ Nama Pembeli tidak ditemukan');
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
        message: `✅ Parser selesai! Semua 6 data berhasil diekstrak.`,
      });
    } else if (successCount > 0) {
      setParserStatus({
        type: 'partial',
        message: `⚠️ Parser selesai. ${successCount}/6 data berhasil diekstrak. ${errorCount} data tidak ditemukan.`,
      });
    } else {
      setParserStatus({
        type: 'error',
        message: `❌ Parser gagal. Tidak ada data yang berhasil diekstrak. Pastikan format Itemku benar.`,
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

      alert('✅ Order processed successfully!');
      resetCashier();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Unknown error occurred';
      alert(`❌ Error: ${errorMessage}`);
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
              <div className="mb-8 border border-gray-200 rounded-none">
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => setIsParserOpen(!isParserOpen)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className="font-semibold text-black font-sans">
                      Itemku Parser
                    </span>
                    {parserStatus.type === 'success' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-none">
                        ✓ Success
                      </span>
                    )}
                    {parserStatus.type === 'partial' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-none">
                        ⚠ Partial
                      </span>
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
                    <textarea
                      value={parserText}
                      onChange={(e) => setParserText(e.target.value)}
                      placeholder="Paste raw text dari Itemku di sini..."
                      className="w-full bg-white text-sm text-black font-sans py-2 px-3 border border-gray-300 rounded-none focus:border-black focus:outline-none transition-colors resize-none h-20"
                    />

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleParseButtonClick}
                        className="flex-1 bg-black text-white font-sans font-semibold py-2 rounded-none transition-all hover:opacity-90 active:scale-95"
                      >
                        Parse Itemku
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setParserText('');
                          setParserStatus({ type: 'idle', message: '' });
                        }}
                        className="px-4 py-2 border border-gray-300 bg-white text-black font-sans font-semibold rounded-none transition-all hover:border-black active:scale-95"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Parser Status Message */}
                    {parserStatus.type !== 'idle' && (
                      <div
                        className={`p-3 rounded-none text-xs font-sans ${
                          parserStatus.type === 'success'
                            ? 'bg-green-50 border border-green-300 text-green-700'
                            : parserStatus.type === 'partial'
                            ? 'bg-yellow-50 border border-yellow-300 text-yellow-700'
                            : 'bg-red-50 border border-red-300 text-red-700'
                        }`}
                      >
                        {parserStatus.message}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 font-sans">
                      Ekstrak: Order ID, Item Name, User ID, Zone ID, Username, dan Nama Pembeli dari raw Itemku text.
                    </p>
                  </div>
                )}
              </div>

              {/* GROUP 1: Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Order ID Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Order ID
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g., OD0000001"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                {/* Item Name Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={handleItemNameChange}
                    placeholder="e.g., Starlight Card"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
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
                  <input
                    type="text"
                    value={targetId}
                    onChange={handleTargetIdChange}
                    placeholder="Game ID"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                {/* Zone Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Zone
                  </label>
                  <input
                    type="text"
                    value={serverId}
                    onChange={handleServerIdChange}
                    placeholder="Zone ID"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
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
                  <input
                    type="text"
                    value={buyerName}
                    onChange={handleBuyerNameChange}
                    placeholder="Player nick"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                {/* Purchaser Name Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Purchaser Name
                  </label>
                  <input
                    type="text"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    placeholder="Pembeli"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
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
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    placeholder="1"
                    min="1"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                {/* Total Diamond Input */}
                <div>
                  <label className="text-[10px] font-semibold text-charcoal font-sans uppercase tracking-wide mb-1 block">
                    Total Diamond
                  </label>
                  <input
                    type="number"
                    value={totalDiamond}
                    onChange={handleTotalDiamondChange}
                    placeholder="0"
                    min="0"
                    className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
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
              <button
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
                className="w-full bg-black text-white font-sans font-semibold py-3 rounded-none transition-all duration-200 hover:bg-charcoal active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createOrderMutation.isPending
                  ? 'PROCESSING...'
                  : 'PROCESS ORDER'}
              </button>

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
  account: {
    id: number;
    name: string;
    game_id: string;
    zone: string;
    server_id: string;
    stock_diamond: number;
    real_diamond: number;
    potential_diamond: number;
    is_active: boolean;
  };
  isSelected: boolean;
  remainingBalance?: number;
  category?: 'cukup' | 'cukup-potensial' | 'minus';
  totalDiamond?: number;
  onToggle: () => void;
}

interface AccountListByCategoryProps {
  accounts: any[];
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
  const cukup = accounts.filter(
    (acc) => acc.real_diamond >= totalDiamond
  );
  const cukupPotensial = accounts.filter(
    (acc) => acc.real_diamond < totalDiamond && acc.potential_diamond >= totalDiamond
  );
  const tidakCukup = accounts.filter(
    (acc) => acc.potential_diamond < totalDiamond
  );

  const renderCategory = (
    title: string,
    accountList: any[],
    categoryKey: 'cukup' | 'cukup-potensial' | 'minus'
  ) => {
    if (accountList.length === 0) return null;

    return (
      <div key={categoryKey} className="mb-8">
        {/* Category Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-400">
          <h3 className="text-sm font-serif font-bold text-black uppercase tracking-wide">
            {title}
          </h3>
          <span className="text-xs font-sans bg-gray-200 text-gray-700 px-2 py-1 rounded-none">
            {accountList.length}
          </span>
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
      {renderCategory('✓ CUKUP', cukup, 'cukup')}
      {renderCategory('~ CUKUP (DENGAN POTENSI)', cukupPotensial, 'cukup-potensial')}
      {renderCategory('✗ TIDAK CUKUP (MINUS)', tidakCukup, 'minus')}
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
  return (
    <div
      onClick={onToggle}
      className={`flex items-start gap-4 p-4 border rounded-none cursor-pointer transition-colors ${
        category === 'cukup'
          ? 'border-green-300 bg-green-50 hover:bg-green-100'
          : category === 'cukup-potensial'
          ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
          : 'border-red-300 bg-red-50 hover:bg-red-100'
      }`}
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
          {category === 'cukup-potensial' && totalDiamond && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-serif font-semibold text-gray-700">
                {account.potential_diamond.toLocaleString()}
              </p>
              <span className="text-xs text-gray-500 font-sans">
                potential ({(account.potential_diamond - account.real_diamond).toLocaleString()} more)
              </span>
            </div>
          )}
          {isSelected && remainingBalance !== undefined && (
            <div className="flex items-center gap-3">
              <p
                className={`text-sm font-serif font-semibold ${
                  remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
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
    </div>
  );
};

export default Cashier;
