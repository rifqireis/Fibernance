import React, { useState } from 'react';
import {
  useAccounts,
  Account,
  updateAccount,
  CreateAccountPayload,
} from '../api/accounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

const Inventory: React.FC = () => {
  const { data: accounts, isLoading, error } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const createAccountMutation = useMutation({
    mutationFn: async (payload: CreateAccountPayload) => {
      const response = await apiClient.post('/api/accounts', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsModalOpen(false);
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<CreateAccountPayload>;
    }) => {
      return await updateAccount(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsEditModalOpen(false);
      setEditingAccount(null);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-charcoal font-sans text-sm">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-sans text-sm">
            Error loading accounts: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Add Button */}
      <div className="border-b border-gray-200 px-4 lg:px-8 py-6 lg:py-12 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif font-semibold text-black">Inventory</h1>
          <p className="mt-2 text-sm text-gray-600 font-sans">Account overview and diamond stock management</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white font-sans font-semibold py-2 px-6 rounded-none transition-all hover:opacity-90 active:scale-95"
        >
          + Add Account
        </button>
      </div>

      {/* Accounts List */}
      <div className="px-4 lg:px-8 py-12">
        {accounts && accounts.length > 0 ? (
          <div className="animate-fade-slide-up space-y-4 md:space-y-0">
            {/* Desktop: Table Layout */}
            <div className="hidden md:block overflow-x-auto pb-4 border border-gray-200 rounded-none">
              <div className="min-w-[900px]">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-6 px-6 py-4 bg-gray-50 border-b border-gray-300">
                  <div className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide">Account</div>
                  <div className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide">Real Diamond</div>
                  <div className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide">Potential Diamond</div>
                  <div className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide">Classification</div>
                  <div className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide">Status</div>
                </div>

                {/* Table Rows */}
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onEdit={(acc) => {
                      setEditingAccount(acc);
                      setIsEditModalOpen(true);
                    }}
                    isMobile={false}
                    isExpanded={false}
                    onToggleExpand={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Mobile: Card Layout */}
            <div className="md:hidden space-y-3">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onEdit={(acc) => {
                    setEditingAccount(acc);
                    setIsEditModalOpen(true);
                  }}
                  isMobile={true}
                  isExpanded={expandedAccountId === account.id}
                  onToggleExpand={() =>
                    setExpandedAccountId(expandedAccountId === account.id ? null : account.id)
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-charcoal font-sans text-sm">No accounts found</p>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {isModalOpen && (
        <AddAccountModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={(formData) => createAccountMutation.mutate(formData)}
          isLoading={createAccountMutation.isPending}
        />
      )}

      {/* Edit Account Modal */}
      {isEditModalOpen && editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAccount(null);
          }}
          onSubmit={(formData) =>
            updateAccountMutation.mutate({
              id: editingAccount.id,
              payload: formData,
            })
          }
          isLoading={updateAccountMutation.isPending}
        />
      )}
    </div>
  );
};

interface AccountRowProps {
  account: Account;
  onEdit: (account: Account) => void;
  isMobile: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AccountRow: React.FC<AccountRowProps> = ({ account, onEdit, isMobile, isExpanded, onToggleExpand }) => {
  // Determine classification badge styling
  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'Available':
        return (
          <div className="inline-block px-3 py-1 bg-green-100 border border-green-300 rounded-none">
            <p className="text-xs font-sans font-bold text-green-700">
              {classification}
            </p>
          </div>
        );
      case 'Forecast':
        return (
          <div className="inline-block px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-none">
            <p className="text-xs font-sans font-bold text-yellow-700">
              {classification}
            </p>
          </div>
        );
      case 'Preorder':
        return (
          <div className="inline-block px-3 py-1 bg-red-100 border border-red-300 rounded-none">
            <p className="text-xs font-sans font-bold text-red-700">
              {classification}
            </p>
          </div>
        );
      default:
        return (
          <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-300 rounded-none">
            <p className="text-xs font-sans font-bold text-gray-700">
              Unknown
            </p>
          </div>
        );
    }
  };

  // Mobile: Compact Expandable Card Layout
  if (isMobile) {
    return (
      <div className="border border-gray-200 rounded-none bg-white overflow-hidden">
        {/* Card Header - Always Visible (Clickable to Expand) */}
        <button
          onClick={onToggleExpand}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          {/* Left: Account Name & Zone */}
          <div className="flex flex-col items-start">
            <p className="font-sans font-semibold text-black text-sm">{account.name}</p>
            <p className="text-xs text-gray-600 mt-1">{account.zone}</p>
          </div>

          {/* Right: Real Diamond & Label */}
          <div className="flex flex-col items-end">
            <p className="font-serif font-semibold text-black text-sm">{account.real_diamond.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">diamond</p>
          </div>
        </button>

        {/* Card Details - Expandable */}
        {isExpanded && (
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-3">
            {/* Potential Diamond */}
            <div>
              <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Potential Diamond</p>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-lg font-semibold text-black">{account.potential_diamond.toLocaleString()}</p>
                {account.wdp_potential_capped > 0 && (
                  <span className="text-xs text-gray-600 font-sans">+{account.wdp_potential_capped}</span>
                )}
              </div>
            </div>

            {/* Classification Badge */}
            <div>
              <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-2">Classification</p>
              {getClassificationBadge(account.classification)}
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1">Status</p>
              <div className="space-y-1">
                {account.pending_wdp > 0 && (
                  <p className="text-sm text-red-600 font-sans font-semibold flex items-center gap-1">
                    <span>💳</span> Debt: {Math.ceil(account.pending_wdp / 100)} days
                  </p>
                )}
                <p className="text-xs text-gray-500 font-sans">{account.is_active ? '✓ Active' : '✗ Inactive'}</p>
              </div>
            </div>

            {/* Edit Button */}
            <div className="pt-2 border-t border-gray-300">
              <button
                onClick={() => onEdit(account)}
                className="w-full text-xs px-3 py-2 border border-gray-300 bg-white text-black rounded-none font-medium hover:border-black hover:bg-gray-100 active:scale-95 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: Table Row Layout
  return (
    <div className="grid grid-cols-5 gap-6 px-6 py-6 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 items-center">
      {/* Account Name & Details */}
      <div className="flex flex-col justify-center">
        <p className="font-sans font-semibold text-black text-base">
          {account.name}
        </p>
        <p className="text-xs text-gray-500 font-sans mt-1">
          {account.game_id} ({account.zone})
        </p>
      </div>

      {/* Real Diamond (Current Stock) */}
      <div className="flex items-center">
        <div className="text-left">
          <p className="font-serif text-2xl font-semibold text-black">
            {account.real_diamond.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 font-sans mt-1">diamond</p>
        </div>
      </div>

      {/* Potential Diamond (Stock + WDP) */}
      <div className="flex items-center">
        <div className="text-left">
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-2xl font-semibold text-black">
              {account.potential_diamond.toLocaleString()}
            </p>
            {account.wdp_potential_capped > 0 && (
              <span className="text-xs text-gray-600 font-sans">
                +{account.wdp_potential_capped}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-sans mt-1">potential</p>
        </div>
      </div>

      {/* Classification Badge */}
      <div className="flex items-center">
        {getClassificationBadge(account.classification)}
      </div>

      {/* Debt & Active Status */}
      <div className="flex flex-col justify-center gap-3">
        <div className="space-y-1">
          {account.pending_wdp > 0 && (
            <p className="text-sm text-red-600 font-sans font-semibold flex items-center gap-1">
              <span>💳</span> Debt: {Math.ceil(account.pending_wdp / 100)} days
            </p>
          )}
          <p className="text-xs text-gray-500 font-sans">
            {account.is_active ? '✓ Active' : '✗ Inactive'}
          </p>
        </div>
        <button
          onClick={() => onEdit(account)}
          className="text-xs px-3 py-1 border border-gray-300 bg-white text-black rounded-none font-medium hover:border-black hover:bg-gray-100 active:scale-95 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

interface AddAccountModalProps {
  onClose: () => void;
  onSubmit: (formData: CreateAccountPayload) => void;
  isLoading: boolean;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [zone, setZone] = useState('');
  const [serverId, setServerId] = useState('');
  const [stockDiamond, setStockDiamond] = useState(0);
  const [wdpDays, setWdpDays] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !gameId.trim() || !zone.trim() || !serverId.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      name: name.trim(),
      game_id: gameId.trim(),
      zone: zone.trim(),
      server_id: serverId.trim(),
      stock_diamond: Math.max(0, stockDiamond),
      pending_wdp: Math.max(0, wdpDays * 100), // Convert days to WDP
      is_active: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-[90%] md:w-full max-w-md rounded-none border border-gray-200 p-4 md:p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-serif font-semibold text-black mb-6">
          Add New Account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Nickname */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Account_001"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Game ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Game ID
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="e.g., 123456789"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Zone */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Zone
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g., Asia"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Server ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Server ID
            </label>
            <input
              type="text"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="e.g., server_asia_1"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Stock Diamond */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Stock Diamond
            </label>
            <input
              type="number"
              value={stockDiamond}
              onChange={(e) => setStockDiamond(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* WDP Days */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              WDP Days
            </label>
            <input
              type="number"
              value={wdpDays}
              onChange={(e) => setWdpDays(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 font-sans mt-2">
              Note: 1 Hari = 20 Diamond. (1 WDP = 80 DM Instan + 7 Hari WDP)
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => prev + 80);
                  setWdpDays((prev) => prev + 7);
                }}
                className="px-3 py-1 bg-black text-white text-xs font-semibold rounded-none hover:bg-gray-800 disabled:opacity-50"
                disabled={isLoading}
              >
                + 1 WDP
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => Math.max(0, prev - 80));
                  setWdpDays((prev) => Math.max(0, prev - 7));
                }}
                className="px-3 py-1 border border-black text-black text-xs font-semibold rounded-none hover:bg-gray-100 disabled:opacity-50"
                disabled={isLoading}
              >
                - 1 WDP
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-2 border border-gray-300 bg-white text-black rounded-none font-medium hover:border-black hover:bg-gray-50 active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-2 bg-black text-white rounded-none font-medium hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditAccountModalProps {
  account: Account;
  onClose: () => void;
  onSubmit: (formData: Partial<CreateAccountPayload>) => void;
  isLoading: boolean;
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({
  account,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState(account.name);
  const [gameId, setGameId] = useState(account.game_id);
  const [zone, setZone] = useState(account.zone);
  const [serverId, setServerId] = useState(account.server_id);
  const [stockDiamond, setStockDiamond] = useState(account.stock_diamond);
  const [wdpDays, setWdpDays] = useState(Math.ceil(account.pending_wdp / 100));
  const [isActive, setIsActive] = useState(account.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !gameId.trim() || !zone.trim() || !serverId.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      name: name.trim(),
      game_id: gameId.trim(),
      zone: zone.trim(),
      server_id: serverId.trim(),
      stock_diamond: Math.max(0, stockDiamond),
      pending_wdp: Math.max(0, wdpDays * 100),
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-[90%] md:w-full max-w-md rounded-none border border-gray-200 p-4 md:p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-serif font-semibold text-black mb-6">
          Edit Account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Nickname */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Account_001"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Game ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Game ID
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="e.g., 123456789"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Zone */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Zone
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g., Asia"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Server ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Server ID
            </label>
            <input
              type="text"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="e.g., server_asia_1"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Stock Diamond */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Stock Diamond
            </label>
            <input
              type="number"
              value={stockDiamond}
              onChange={(e) => setStockDiamond(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* WDP Days */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              WDP Days
            </label>
            <input
              type="number"
              value={wdpDays}
              onChange={(e) => setWdpDays(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className="w-full bg-transparent text-sm text-black font-sans py-2 border-b border-gray-300 focus:border-black focus:outline-none transition-colors"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 font-sans mt-2">
              Note: 1 Hari = 20 Diamond. (1 WDP = 80 DM Instan + 7 Hari WDP)
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => prev + 80);
                  setWdpDays((prev) => prev + 7);
                }}
                className="px-3 py-1 bg-black text-white text-xs font-semibold rounded-none hover:bg-gray-800 disabled:opacity-50"
                disabled={isLoading}
              >
                + 1 WDP
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => Math.max(0, prev - 80));
                  setWdpDays((prev) => Math.max(0, prev - 7));
                }}
                className="px-3 py-1 border border-black text-black text-xs font-semibold rounded-none hover:bg-gray-100 disabled:opacity-50"
                disabled={isLoading}
              >
                - 1 WDP
              </button>
            </div>
          </div>

          {/* Is Active Status */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-3 block">
              Status
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-none font-medium transition-colors ${
                  isActive
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-none font-medium transition-colors ${
                  !isActive
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-2 border border-gray-300 bg-white text-black rounded-none font-medium hover:border-black hover:bg-gray-50 active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-2 bg-black text-white rounded-none font-medium hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
