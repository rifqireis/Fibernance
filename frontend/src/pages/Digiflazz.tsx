import React, { useState, useEffect } from 'react';
import { useAccounts } from '../api/accounts';

// SKU options
const SKU_PRODUCTS = [
  { sku: 'WDP_BR', label: 'Weekly Diamond Pass - Brazil' },
  { sku: 'WDP_TR', label: 'Weekly Diamond Pass - Turkey' },
  { sku: 'ML_86', label: '86 Diamonds' },
];

// Type definitions
interface WDPPrices {
  brazil: number | null;
  turkey: number | null;
  min: number | null;
  cached: boolean;
  cache_age: number;
  error?: string;
}

// WDP Price Card Component
const WDPPriceCard: React.FC<{ prices: WDPPrices | null; isLoading: boolean }> = ({ prices, isLoading }) => {
  // Hardcoded cost prices (can be replaced with SKU_PRODUCTS data later)
  const WDP_BR_COST = 0;
  const WDP_TR_COST = 0;

  const formatRupiah = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const calculateMargin = (cost: number, market: number | null): string => {
    if (market === null || cost === 0) return '-';
    const margin = ((market - cost) / cost * 100).toFixed(1);
    return `${margin}%`;
  };

  return (
    <div className="mt-8 pt-8 pb-8 border-t border-gray-200">
      {/* Title */}
      <p className="text-xs font-semibold text-gray-600 font-sans uppercase tracking-wide mb-4">
        📊 Info Harga WDP Termurah
      </p>

      {isLoading ? (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
          <p className="text-sm text-gray-600 font-sans">Loading prices...</p>
        </div>
      ) : prices ? (
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200 shadow-sm">
          {/* Brazil WDP Row */}
          <div className="flex justify-between items-center py-3 border-b border-purple-200/50">
            <div>
              <p className="text-sm font-semibold text-gray-800 font-sans">Termurah Brazil (Pasaran)</p>
              <p className="text-xs text-gray-600 font-sans mt-1">Harga publik terendah</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-700 font-serif">
                {formatRupiah(prices.brazil)}
              </p>
            </div>
          </div>

          {/* Turkey WDP Row */}
          <div className="flex justify-between items-center py-3 border-b border-purple-200/50">
            <div>
              <p className="text-sm font-semibold text-gray-800 font-sans">Termurah Turkey (Pasaran)</p>
              <p className="text-xs text-gray-600 font-sans mt-1">Harga publik terendah</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-purple-700 font-serif">
                {formatRupiah(prices.turkey)}
              </p>
            </div>
          </div>

          {/* Cost Brazil Row */}
          <div className="flex justify-between items-center py-3 border-b border-purple-200/50">
            <div>
              <p className="text-sm font-semibold text-gray-800 font-sans">Harga Modal WDP_BR</p>
              <p className="text-xs text-gray-600 font-sans mt-1">
                Margin: {calculateMargin(WDP_BR_COST, prices.brazil)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-indigo-700 font-serif">
                {formatRupiah(WDP_BR_COST)}
              </p>
            </div>
          </div>

          {/* Cost Turkey Row */}
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 font-sans">Harga Modal WDP_TR</p>
              <p className="text-xs text-gray-600 font-sans mt-1">
                Margin: {calculateMargin(WDP_TR_COST, prices.turkey)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-indigo-700 font-serif">
                {formatRupiah(WDP_TR_COST)}
              </p>
            </div>
          </div>

          {/* Cache Info */}
          <div className="mt-3 pt-3 border-t border-purple-200/50">
            <p className="text-xs text-gray-500 font-sans">
              {prices.cached ? `✓ Cached ${prices.cache_age}s ago` : '✓ Fresh data'}
            </p>
          </div>

          {/* Error Message */}
          {prices.error && (
            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
              <p className="text-xs text-red-700 font-sans">{prices.error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
          <p className="text-sm text-gray-600 font-sans">Unable to load prices</p>
        </div>
      )}
    </div>
  );
};


const Digiflazz: React.FC = () => {
  const { data: accounts, isLoading } = useAccounts();
  const [activeTab, setActiveTab] = useState<'regular' | 'lunasi'>('regular');
  const [wdpPrices, setWdpPrices] = useState<WDPPrices | null>(null);
  const [wdpLoading, setWdpLoading] = useState(true);

  // Fetch WDP prices on component mount
  useEffect(() => {
    const fetchWDPPrices = async () => {
      try {
        const response = await fetch('/api/digiflazz/wdp-cheapest');
        const data = await response.json();
        setWdpPrices(data);
      } catch (error) {
        console.error('Failed to fetch WDP prices:', error);
        setWdpPrices({
          brazil: null,
          turkey: null,
          min: null,
          cached: false,
          cache_age: 0,
          error: 'Failed to fetch prices',
        });
      } finally {
        setWdpLoading(false);
      }
    };

    fetchWDPPrices();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-12">
        <h1 className="text-4xl font-serif font-semibold text-black">
          Digiflazz
        </h1>
        <p className="mt-2 text-sm text-gray-600 font-sans">
          Restock management and Digiflazz transactions
        </p>

        {/* Balance Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 font-sans uppercase tracking-wide mb-3">
            Available Balance
          </p>
          <p className="text-4xl font-serif font-semibold text-black">
            Rp 5.000.000
          </p>
          <p className="text-xs text-gray-500 font-sans mt-2">
            Last updated: 16 Mar 2026, 10:30 WIB
          </p>
        </div>

        {/* WDP Price Info Card */}
        <WDPPriceCard prices={wdpPrices} isLoading={wdpLoading} />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('regular')}
          className={`flex-1 px-8 py-4 text-sm font-sans font-semibold transition-all ${
            activeTab === 'regular'
              ? 'border-b-2 border-black text-black'
              : 'text-gray-500 hover:text-black'
          }`}
        >
          Topup Regular
        </button>
        <button
          onClick={() => setActiveTab('lunasi')}
          className={`flex-1 px-8 py-4 text-sm font-sans font-semibold transition-all ${
            activeTab === 'lunasi'
              ? 'border-b-2 border-black text-black'
              : 'text-gray-500 hover:text-black'
          }`}
        >
          Lunasi Hutang
        </button>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-300px)]">
        {/* Left Column - Topup Regular */}
        {activeTab === 'regular' && (
          <div className="flex-1 border-r border-gray-200 overflow-y-auto p-8">
            <TopupRegularForm accounts={accounts} isLoading={isLoading} />
          </div>
        )}

        {/* Right Column - Lunasi Hutang */}
        {activeTab === 'lunasi' && (
          <div className="flex-1 overflow-y-auto p-8">
            <LunasiHutangForm accounts={accounts} isLoading={isLoading} />
          </div>
        )}
      </div>
    </div>
  );
};

interface FormProps {
  accounts: any[] | undefined;
  isLoading: boolean;
}

const TopupRegularForm: React.FC<FormProps> = ({ accounts, isLoading }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId || !selectedSku) {
      alert('Please select an account and an SKU product');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Call API to submit topup
      // mutation payload should include: account_id, sku, type: 'REGULAR'
      alert('✅ Topup regular submitted! (Mock)');
      setSelectedAccountId('');
      setSelectedSku('');
    } catch (error) {
      alert('❌ Error submitting topup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-serif font-semibold text-black mb-8">
        Topup Regular
      </h2>

      {isLoading ? (
        <p className="text-sm text-gray-600 font-sans">Loading accounts...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Selection */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Pilih Akun Gudang
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-transparent text-base text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
            >
              <option value="">Select an account</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.game_id}) - Stock: {acc.real_diamond}
                </option>
              ))}
            </select>
          </div>

          {/* SKU Product Selection */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Pilih SKU Produk
            </label>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full bg-transparent text-base text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
            >
              <option value="">Select a product</option>
              {SKU_PRODUCTS.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} - {product.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 font-sans mt-2">
              Example: WDP_BR, WDP_TR, ML_86
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-8 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting || !selectedAccountId || !selectedSku}
              className="w-full bg-black text-white font-sans font-semibold py-3 rounded-none transition-all duration-200 hover:bg-charcoal active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'PROCESSING...' : 'TOPUP REGULAR'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const LunasiHutangForm: React.FC<FormProps> = ({ accounts, isLoading }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only accounts with pending_wdp > 0
  const accountsWithDebt = accounts?.filter((acc) => acc.pending_wdp > 0) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId || !selectedSku) {
      alert('Please select an account with debt and an SKU product');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Call API to submit lunasi
      // mutation payload should include: account_id, sku, type: 'LUNASI'
      alert('✅ Lunasi hutang submitted! (Mock)');
      setSelectedAccountId('');
      setSelectedSku('');
    } catch (error) {
      alert('❌ Error submitting lunasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-serif font-semibold text-black mb-8">
        Lunasi Hutang
      </h2>

      {isLoading ? (
        <p className="text-sm text-gray-600 font-sans">Loading accounts...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Selection */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Pilih Akun dengan Hutang
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-transparent text-base text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
            >
              <option value="">Select an account</option>
              {accountsWithDebt?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.game_id}) - Debt: {Math.ceil(acc.pending_wdp / 100)} days
                </option>
              ))}
            </select>
            {accountsWithDebt.length === 0 && (
              <p className="text-xs text-gray-500 font-sans mt-2">
                No accounts with debt available
              </p>
            )}
          </div>

          {/* SKU Product Selection */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Pilih SKU Produk
            </label>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full bg-transparent text-base text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
            >
              <option value="">Select a product</option>
              {SKU_PRODUCTS.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} - {product.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-none">
            <p className="text-xs text-gray-700 font-sans">
              <span className="font-semibold">Catatan:</span> Diamond akan dikurangi ke
              pending_wdp terlebih dahulu, sisanya masuk ke stock.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-8 border-t border-gray-200">
            <button
              type="submit"
              disabled={
                isSubmitting || !selectedAccountId || !selectedSku || accountsWithDebt.length === 0
              }
              className="w-full bg-black text-white font-sans font-semibold py-3 rounded-none transition-all duration-200 hover:bg-charcoal active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'PROCESSING...' : 'LUNASI HUTANG'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Digiflazz;
