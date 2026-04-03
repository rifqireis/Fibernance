import React, { useEffect, useRef, useState } from 'react';
import { useAccounts } from '../api/accounts';
import { usePurchaseQueue, type PurchaseQueueItem } from '../api/digiflazz';
import { Badge, Button, Card, Input, Select, cn } from '../components/ui';

const SKU_PRODUCTS = [
  { sku: 'WDP_BR', label: 'Weekly Diamond Pass - Brazil' },
  { sku: 'WDP_TR', label: 'Weekly Diamond Pass - Turkey' },
  { sku: 'ML_86', label: '86 Diamonds' },
];

interface WDPPrices {
  brazil: number | null;
  turkey: number | null;
  min: number | null;
  cached: boolean;
  cache_age: number;
  error?: string;
}

interface BalanceData {
  saldo: string;
  saldo_formatted: string;
  timestamp: string;
  status: string;
}

interface FormProps {
  accounts: any[] | undefined;
  isLoading: boolean;
}

const digiflazzTabButtonClass =
  'h-auto border-b-2 border-x-0 border-t-0 px-6 py-4 text-sm font-semibold uppercase tracking-wide focus:ring-0 focus:ring-offset-0';

const compactButtonClass = 'h-auto px-4 py-2 text-xs uppercase tracking-wide';

const formatRupiah = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatTimestamp = (value: string | undefined): string => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-US');
};

const formatQueueAge = (value: string): string => {
  const createdAt = new Date(value);
  const diffMs = Date.now() - createdAt.getTime();

  if (Number.isNaN(createdAt.getTime()) || diffMs < 0) {
    return 'Waiting time unavailable';
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `Waiting ${days}d ${hours}h`;
  }

  if (totalHours > 0) {
    return `Waiting ${totalHours}h`;
  }

  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `Waiting ${minutes}m`;
};

const calculateMargin = (cost: number | null, market: number | null): string => {
  if (market === null || cost === null || cost === 0) return 'Not available';
  return `${(((market - cost) / cost) * 100).toFixed(1)}%`;
};

const WDPPriceCard: React.FC<{
  prices: WDPPrices | null;
  isLoading: boolean;
  wdpBrCost: number | null;
  wdpTrCost: number | null;
  onCostChange?: (type: 'br' | 'tr', value: number) => void;
  onSaveCost?: (type: string, cost: number) => Promise<void>;
  onRefresh?: () => void;
  isSaving?: boolean;
}> = ({
  prices,
  isLoading,
  wdpBrCost,
  wdpTrCost,
  onCostChange,
  onSaveCost,
  onRefresh,
  isSaving,
}) => {
  const [isEditingBr, setIsEditingBr] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [tempBrCost, setTempBrCost] = useState(String(wdpBrCost || ''));
  const [tempTrCost, setTempTrCost] = useState(String(wdpTrCost || ''));

  useEffect(() => {
    setTempBrCost(String(wdpBrCost || ''));
  }, [wdpBrCost]);

  useEffect(() => {
    setTempTrCost(String(wdpTrCost || ''));
  }, [wdpTrCost]);

  const handleSaveBrCost = async () => {
    const newCost = parseInt(tempBrCost, 10);
    if (Number.isNaN(newCost) || newCost < 0) {
      alert('Enter a valid cost value.');
      setTempBrCost(String(wdpBrCost || ''));
      return;
    }

    try {
      if (onSaveCost) {
        await onSaveCost('WDP_BR', newCost);
      }
      if (onCostChange) {
        onCostChange('br', newCost);
      }
      setIsEditingBr(false);
    } catch (error) {
      console.error('Failed to save WDP_BR cost price:', error);
    }
  };

  const handleSaveTrCost = async () => {
    const newCost = parseInt(tempTrCost, 10);
    if (Number.isNaN(newCost) || newCost < 0) {
      alert('Enter a valid cost value.');
      setTempTrCost(String(wdpTrCost || ''));
      return;
    }

    try {
      if (onSaveCost) {
        await onSaveCost('WDP_TR', newCost);
      }
      if (onCostChange) {
        onCostChange('tr', newCost);
      }
      setIsEditingTr(false);
    } catch (error) {
      console.error('Failed to save WDP_TR cost price:', error);
    }
  };

  const renderEditableValue = (
    value: number | null,
    isEditing: boolean,
    tempValue: string,
    onTempChange: (value: string) => void,
    onSave: () => Promise<void>,
    onCancel: () => void,
    onEdit: () => void
  ) => {
    if (isEditing) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <Input
            type="number"
            value={tempValue}
            onChange={(event) => onTempChange(event.target.value)}
            className="w-28 text-sm"
          />
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="h-auto px-3 py-2 text-xs uppercase tracking-wide"
          >
            {isSaving ? 'Saving' : 'Save'}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="h-auto px-3 py-2 text-xs uppercase tracking-wide"
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <Button
        type="button"
        onClick={onEdit}
        variant="ghost"
        className="h-auto border-0 border-b border-gray-400 px-0 pb-1 pt-0 text-lg font-serif font-semibold text-black hover:border-b hover:border-black hover:bg-transparent"
        title="Edit cost price"
      >
        {formatRupiah(value)}
      </Button>
    );
  };

  return (
    <section className="mt-8 border-t border-gray-200 pt-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label">Market Pricing</p>
          <h2 className="mt-2 text-2xl font-serif font-semibold text-black">Weekly Pass Snapshot</h2>
          <p className="mt-2 text-sm text-gray-600">
            Track market references and internal cost prices in one monochrome panel.
          </p>
        </div>
        {onRefresh && (
          <Button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            variant="secondary"
            className={compactButtonClass}
          >
            Refresh Prices
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="mt-6 border-gray-200 p-6">
          <p className="text-sm text-gray-600">Loading market prices. Auto refresh runs every 10 minutes.</p>
        </Card>
      ) : prices && prices.error ? (
        <Card className="mt-6 border-red-200 bg-red-50 p-6">
          <Badge variant="error">Market Unavailable</Badge>
          <p className="mt-4 text-sm font-semibold text-black">Failed to load market prices.</p>
          <p className="mt-1 text-sm text-gray-700">{prices.error}</p>
        </Card>
      ) : prices ? (
        <Card className="mt-6 border-gray-200 p-0">
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="section-label">Brazil Market</p>
                <p className="mt-2 text-sm text-gray-600">Lowest public reference for WDP Brazil.</p>
              </div>
              <p className="text-xl font-serif font-semibold text-black">{formatRupiah(prices.brazil)}</p>
            </div>
          </div>

          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="section-label">Turkey Market</p>
                <p className="mt-2 text-sm text-gray-600">Lowest public reference for WDP Turkey.</p>
              </div>
              <p className="text-xl font-serif font-semibold text-black">{formatRupiah(prices.turkey)}</p>
            </div>
          </div>

          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="section-label">WDP_BR Cost</p>
                <p className="mt-2 text-sm text-gray-600">Margin: {calculateMargin(wdpBrCost, prices.brazil)}</p>
              </div>
              {renderEditableValue(
                wdpBrCost,
                isEditingBr,
                tempBrCost,
                setTempBrCost,
                handleSaveBrCost,
                () => {
                  setIsEditingBr(false);
                  setTempBrCost(String(wdpBrCost || ''));
                },
                () => setIsEditingBr(true)
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="section-label">WDP_TR Cost</p>
                <p className="mt-2 text-sm text-gray-600">Margin: {calculateMargin(wdpTrCost, prices.turkey)}</p>
              </div>
              {renderEditableValue(
                wdpTrCost,
                isEditingTr,
                tempTrCost,
                setTempTrCost,
                handleSaveTrCost,
                () => {
                  setIsEditingTr(false);
                  setTempTrCost(String(wdpTrCost || ''));
                },
                () => setIsEditingTr(true)
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {prices.cached ? `Cached ${prices.cache_age}s ago` : 'Live response'}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="mt-6 border-red-200 bg-red-50 p-6">
          <Badge variant="error">Market Unavailable</Badge>
          <p className="mt-4 text-sm text-gray-700">Refresh to retry the pricing request.</p>
        </Card>
      )}
    </section>
  );
};

const TopupRegularForm: React.FC<FormProps> = ({ accounts, isLoading }) => {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedAccountId || !selectedSku) {
      alert('Select an account and a product before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      alert('Regular top-up submitted.');
      setSelectedAccountId('');
      setSelectedSku('');
    } catch (error) {
      alert('Unable to submit the regular top-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="section-label">Workflow</p>
      <h2 className="mt-2 text-2xl font-serif font-semibold text-black">Regular Top-up</h2>
      <p className="mt-2 text-sm text-gray-600">Submit a standard stock top-up for a warehouse account.</p>

      {isLoading ? (
        <p className="mt-8 text-sm text-gray-600">Loading accounts...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div>
            <label className="section-label block">Warehouse Account</label>
            <Select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="mt-2"
            >
              <option value="">Select an account</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.game_id}) - Stock: {account.real_diamond}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="section-label block">SKU Product</label>
            <Select
              value={selectedSku}
              onChange={(event) => setSelectedSku(event.target.value)}
              className="mt-2"
            >
              <option value="">Select a product</option>
              {SKU_PRODUCTS.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} - {product.label}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-gray-500">Example: WDP_BR, WDP_TR, or ML_86.</p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <Button
              type="submit"
              disabled={isSubmitting || !selectedAccountId || !selectedSku}
              className="h-auto w-full py-3 text-xs uppercase tracking-wide"
            >
              {isSubmitting ? 'Processing' : 'Submit Regular Top-up'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

const DebtSettlementForm: React.FC<FormProps> = ({ accounts, isLoading }) => {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountsWithDebt = accounts?.filter((account) => account.pending_wdp > 0) ?? [];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedAccountId || !selectedSku) {
      alert('Select a debt account and a product before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      alert('Debt settlement submitted.');
      setSelectedAccountId('');
      setSelectedSku('');
    } catch (error) {
      alert('Unable to submit the debt settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="section-label">Workflow</p>
      <h2 className="mt-2 text-2xl font-serif font-semibold text-black">Debt Settlement</h2>
      <p className="mt-2 text-sm text-gray-600">Apply incoming top-up value to outstanding WDP debt before stock.</p>

      {isLoading ? (
        <p className="mt-8 text-sm text-gray-600">Loading accounts...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div>
            <label className="section-label block">Account With Debt</label>
            <Select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="mt-2"
            >
              <option value="">Select an account</option>
              {accountsWithDebt.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.game_id}) - Debt: {Math.ceil(account.pending_wdp / 100)} days
                </option>
              ))}
            </Select>
            {accountsWithDebt.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">No accounts with debt are available.</p>
            )}
          </div>

          <div>
            <label className="section-label block">SKU Product</label>
            <Select
              value={selectedSku}
              onChange={(event) => setSelectedSku(event.target.value)}
              className="mt-2"
            >
              <option value="">Select a product</option>
              {SKU_PRODUCTS.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} - {product.label}
                </option>
              ))}
            </Select>
          </div>

          <Card className="border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-700">
              Incoming diamonds are applied to pending WDP debt first. Any remainder is moved into stock.
            </p>
          </Card>

          <div className="border-t border-gray-200 pt-8">
            <Button
              type="submit"
              disabled={isSubmitting || !selectedAccountId || !selectedSku || accountsWithDebt.length === 0}
              className="h-auto w-full py-3 text-xs uppercase tracking-wide"
            >
              {isSubmitting ? 'Processing' : 'Submit Debt Settlement'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

const PurchaseQueuePanel: React.FC<{
  queueItems: PurchaseQueueItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
}> = ({ queueItems, isLoading, error }) => {
  return (
    <div>
      <p className="section-label">Workflow</p>
      <h2 className="mt-2 text-2xl font-serif font-semibold text-black">Purchase Queue</h2>
      <p className="mt-2 text-sm text-gray-600">
        Review active restock deficits emitted by Cashier before supply action is taken.
      </p>

      {isLoading ? (
        <Card className="mt-8 border-gray-200 p-6">
          <p className="text-sm text-gray-600">Loading active purchase queue entries.</p>
        </Card>
      ) : error ? (
        <Card className="mt-8 border-red-200 bg-red-50 p-6">
          <Badge variant="error">Queue Unavailable</Badge>
          <p className="mt-4 text-sm font-semibold text-black">Failed to load purchase queue.</p>
          <p className="mt-1 text-sm text-gray-700">{error.message}</p>
        </Card>
      ) : queueItems && queueItems.length > 0 ? (
        <div className="mt-8 space-y-4">
          {queueItems.map((item) => (
            <Card key={item.id} className="border-gray-200 p-0">
              <div className="border-b border-gray-200 px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="section-label">Account</p>
                    <h3 className="mt-2 text-lg font-serif font-semibold text-black">
                      {item.account_name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">Order {item.order_id}</p>
                  </div>
                  <Badge variant="neutral" className="w-fit px-2 py-1 tracking-normal">
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-b border-gray-200 px-6 py-5 lg:border-b-0 lg:border-r">
                  <p className="section-label">Deficit Amount</p>
                  <p className="mt-2 text-xl font-serif font-semibold text-black">
                    Needs {item.deficit_diamond.toLocaleString()} Diamonds
                  </p>
                </div>
                <div className="px-6 py-5">
                  <p className="section-label">Created</p>
                  <p className="mt-2 text-sm font-semibold text-black">
                    {formatTimestamp(item.created_at)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">
                    {formatQueueAge(item.created_at)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-8 border-gray-200 bg-gray-50 p-6">
          <Badge variant="neutral">Queue Clear</Badge>
          <p className="mt-4 text-sm font-semibold text-black">No active restock queue entries.</p>
          <p className="mt-1 text-sm text-gray-700">
            New Cashier shortages will appear here after backend queue generation.
          </p>
        </Card>
      )}
    </div>
  );
};

const Digiflazz: React.FC = () => {
  const { data: accounts, isLoading } = useAccounts();
  const {
    data: purchaseQueue,
    isLoading: queueLoading,
    error: queueError,
  } = usePurchaseQueue();
  const [activeTab, setActiveTab] = useState<'regular' | 'settlement' | 'queue'>('regular');
  const [wdpPrices, setWdpPrices] = useState<WDPPrices | null>(null);
  const [wdpLoading, setWdpLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [wdpBrCost, setWdpBrCost] = useState<number | null>(null);
  const [wdpTrCost, setWdpTrCost] = useState<number | null>(null);
  const [costPricesSaving, setCostPricesSaving] = useState(false);

  const wdpPriceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const balanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWDPPrices = async () => {
    try {
      const response = await fetch('/api/digiflazz/wdp-cheapest');
      const data = await response.json();
      setWdpPrices(data);
      setWdpLoading(false);
    } catch (error) {
      console.error('Failed to fetch WDP prices:', error);
      setWdpPrices({
        brazil: null,
        turkey: null,
        min: null,
        cached: false,
        cache_age: 0,
        error: 'Failed to fetch market prices.',
      });
      setWdpLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/digiflazz/balance');
      const data = await response.json();
      setBalance(data);
      setBalanceLoading(false);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(null);
      setBalanceLoading(false);
    }
  };

  const fetchCostPrices = async () => {
    try {
      const response = await fetch('/api/digiflazz/wdp-modal');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setWdpBrCost(data.wdp_br || null);
      setWdpTrCost(data.wdp_tr || null);
      return;
    } catch (digiflazzError) {
      console.warn('Digiflazz modal price endpoint failed, using database fallback:', digiflazzError);

      try {
        const response = await fetch('/api/digiflazz/cost-prices');
        const data = await response.json();
        const brPrice = data.find((price: any) => price.type === 'WDP_BR');
        const trPrice = data.find((price: any) => price.type === 'WDP_TR');

        setWdpBrCost(brPrice?.cost_price || null);
        setWdpTrCost(trPrice?.cost_price || null);
      } catch (dbError) {
        console.error('Failed to load cost prices from all sources:', dbError);
        setWdpBrCost(null);
        setWdpTrCost(null);
      }
    }
  };

  const saveCostPrice = async (type: string, costPrice: number) => {
    try {
      setCostPricesSaving(true);
      const response = await fetch(`/api/digiflazz/cost-prices/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost_price: costPrice }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${type} cost price.`);
      }

      const saved = await response.json();
      setCostPricesSaving(false);
      return saved;
    } catch (error) {
      console.error(`Failed to save ${type} cost price:`, error);
      setCostPricesSaving(false);
      alert(`Unable to save ${type} cost price.`);
      throw error;
    }
  };

  useEffect(() => {
    fetchWDPPrices();
    fetchBalance();
    fetchCostPrices();

    wdpPriceIntervalRef.current = setInterval(() => {
      fetchWDPPrices();
    }, 600000);

    balanceIntervalRef.current = setInterval(() => {
      fetchBalance();
    }, 300000);

    const costPriceIntervalRef = setInterval(() => {
      fetchCostPrices();
    }, 600000);

    return () => {
      if (wdpPriceIntervalRef.current) {
        clearInterval(wdpPriceIntervalRef.current);
      }
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
      clearInterval(costPriceIntervalRef);
    };
  }, []);

  const handleCostChange = (type: 'br' | 'tr', value: number) => {
    if (type === 'br') {
      setWdpBrCost(value);
      return;
    }

    setWdpTrCost(value);
  };

  const handleRefreshWDPPrices = async () => {
    setWdpLoading(true);
    await fetchWDPPrices();
  };

  const handleRefreshBalance = async () => {
    setBalanceLoading(true);
    await fetchBalance();
  };

  return (
    <div className="min-h-screen bg-white animate-fade-slide-up">
      <div className="border-b border-gray-200 px-4 py-6 lg:px-8 lg:py-12">
        <h1 className="text-2xl font-serif font-semibold text-black lg:text-4xl">Digiflazz</h1>
        <p className="mt-2 text-sm text-gray-600 font-sans">
          Review balance health, monitor weekly pass pricing, and prepare restock actions.
        </p>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Available Balance</p>
              {balanceLoading ? (
                <div className="mt-3 animate-pulse space-y-2">
                  <div className="h-10 w-48 bg-gray-200 rounded-none"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded-none"></div>
                </div>
              ) : balance ? (
                <>
                  <p className="mt-3 text-3xl font-serif font-semibold text-black lg:text-4xl">
                    {balance.saldo_formatted || 'N/A'}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">
                    Last updated {formatTimestamp(balance.timestamp)}
                  </p>
                </>
              ) : (
                <Card className="mt-4 border-red-200 bg-red-50 p-4">
                  <Badge variant="error">Unavailable</Badge>
                  <p className="mt-3 text-sm text-gray-700">The balance feed could not be loaded from Digiflazz.</p>
                </Card>
              )}
            </div>

            <Button
              type="button"
              onClick={handleRefreshBalance}
              disabled={balanceLoading}
              variant="secondary"
              className={compactButtonClass}
              title="Manual refresh. Balance also refreshes automatically."
            >
              Refresh Balance
            </Button>
          </div>
        </div>

        <WDPPriceCard
          prices={wdpPrices}
          isLoading={wdpLoading}
          wdpBrCost={wdpBrCost}
          wdpTrCost={wdpTrCost}
          onCostChange={handleCostChange}
          onSaveCost={saveCostPrice}
          onRefresh={handleRefreshWDPPrices}
          isSaving={costPricesSaving}
        />
      </div>

      <div className="border-b border-gray-200 px-4 lg:px-8">
        <div className="flex items-center gap-0">
          <Button
            type="button"
            onClick={() => setActiveTab('regular')}
            variant="ghost"
            className={cn(
              digiflazzTabButtonClass,
              activeTab === 'regular'
                ? 'border-black text-black hover:border-black hover:bg-transparent'
                : 'border-transparent text-gray-600 hover:border-transparent hover:bg-transparent hover:text-black',
            )}
          >
            Regular Top-up
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('settlement')}
            variant="ghost"
            className={cn(
              digiflazzTabButtonClass,
              activeTab === 'settlement'
                ? 'border-black text-black hover:border-black hover:bg-transparent'
                : 'border-transparent text-gray-600 hover:border-transparent hover:bg-transparent hover:text-black',
            )}
          >
            Debt Settlement
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('queue')}
            variant="ghost"
            className={cn(
              digiflazzTabButtonClass,
              activeTab === 'queue'
                ? 'border-black text-black hover:border-black hover:bg-transparent'
                : 'border-transparent text-gray-600 hover:border-transparent hover:bg-transparent hover:text-black',
            )}
          >
            Purchase Queue
          </Button>
        </div>
      </div>

      <div className="px-4 py-8 lg:px-8">
        <Card className="border-gray-200 p-6 lg:p-8">
          {activeTab === 'regular' ? (
            <TopupRegularForm accounts={accounts} isLoading={isLoading} />
          ) : activeTab === 'settlement' ? (
            <DebtSettlementForm accounts={accounts} isLoading={isLoading} />
          ) : (
            <PurchaseQueuePanel
              queueItems={purchaseQueue}
              isLoading={queueLoading}
              error={queueError}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Digiflazz;