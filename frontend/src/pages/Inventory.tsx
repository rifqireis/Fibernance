import React, { useState } from 'react';
import {
  useAccounts,
  Account,
  updateAccount,
  CreateAccountPayload,
} from '../api/accounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Badge, Button, Card, Input, Modal, cn } from '../components/ui';

const inventoryUnderlineInputClass =
  'h-auto border-0 border-b border-gray-300 bg-transparent px-0 py-2 focus:border-black focus:ring-0';

const inventoryPrimaryButtonClass = 'h-auto px-6 py-2 text-sm';
const inventoryStepButtonClass = 'h-auto px-3 py-1 text-xs';
const inventoryModalActionClass = 'h-auto flex-1 px-6 py-2 text-sm';

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
        <Button
          onClick={() => setIsModalOpen(true)}
          className={inventoryPrimaryButtonClass}
        >
          + Add Account
        </Button>
      </div>

      {/* Accounts List */}
      <div className="px-4 lg:px-8 py-12">
        {accounts && accounts.length > 0 ? (
          <div className="animate-fade-slide-up space-y-4 md:space-y-0">
            {/* Desktop: Table Layout */}
            <Card className="hidden overflow-x-auto border-gray-200 pb-4 p-0 md:block">
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
            </Card>

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
        return <Badge variant="success">{classification}</Badge>;
      case 'Forecast':
        return <Badge variant="neutral">{classification}</Badge>;
      case 'Preorder':
        return <Badge variant="error">{classification}</Badge>;
      default:
        return <Badge variant="neutral">Unknown</Badge>;
    }
  };

  // Mobile: Compact Expandable Card Layout
  if (isMobile) {
    return (
      <Card className="overflow-hidden border-gray-200 p-0">
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
                  <p className="text-sm text-black font-sans font-semibold">
                    Debt: {Math.ceil(account.pending_wdp / 100)} days
                  </p>
                )}
                <p className="text-xs text-gray-500 font-sans">{account.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>

            {/* Edit Button */}
            <div className="pt-2 border-t border-gray-300">
              <Button
                onClick={() => onEdit(account)}
                variant="secondary"
                className="h-auto w-full px-3 py-2 text-xs"
              >
                Edit
              </Button>
            </div>
          </div>
        )}
      </Card>
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
            <p className="text-sm text-black font-sans font-semibold">
              Debt: {Math.ceil(account.pending_wdp / 100)} days
            </p>
          )}
          <p className="text-xs text-gray-500 font-sans">
            {account.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
        <Button
          onClick={() => onEdit(account)}
          variant="secondary"
          className="h-auto px-3 py-1 text-xs"
        >
          Edit
        </Button>
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
    <Modal
      open
      onClose={onClose}
      className="max-h-[90vh] max-w-md overflow-y-auto border-gray-200"
      contentClassName="p-4 md:p-8"
      showCloseButton={false}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 className="text-2xl font-serif font-semibold text-black">
          Add New Account
        </h2>
        <Button onClick={onClose} variant="secondary" className="h-auto px-3 py-2 text-xs uppercase tracking-wide">
          Close
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Nickname */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Nickname
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Account_001"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Game ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Game ID
            </label>
            <Input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="e.g., 123456789"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Zone */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Zone
            </label>
            <Input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g., Asia"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Server ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Server ID
            </label>
            <Input
              type="text"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="e.g., server_asia_1"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Stock Diamond */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Stock Diamond
            </label>
            <Input
              type="number"
              value={stockDiamond}
              onChange={(e) => setStockDiamond(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* WDP Days */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              WDP Days
            </label>
            <Input
              type="number"
              value={wdpDays}
              onChange={(e) => setWdpDays(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 font-sans mt-2">
              1 day equals 20 diamonds. 1 WDP equals 80 instant diamonds plus 7 WDP days.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => prev + 80);
                  setWdpDays((prev) => prev + 7);
                }}
                className={inventoryStepButtonClass}
                disabled={isLoading}
              >
                + 1 WDP
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => Math.max(0, prev - 80));
                  setWdpDays((prev) => Math.max(0, prev - 7));
                }}
                variant="secondary"
                className={inventoryStepButtonClass}
                disabled={isLoading}
              >
                - 1 WDP
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="secondary"
              className={inventoryModalActionClass}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={inventoryModalActionClass}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
      </form>
    </Modal>
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
    <Modal
      open
      onClose={onClose}
      className="max-h-[90vh] max-w-md overflow-y-auto border-gray-200"
      contentClassName="p-4 md:p-8"
      showCloseButton={false}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 className="text-2xl font-serif font-semibold text-black">
          Edit Account
        </h2>
        <Button onClick={onClose} variant="secondary" className="h-auto px-3 py-2 text-xs uppercase tracking-wide">
          Close
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Nickname */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Nickname
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Account_001"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Game ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Game ID
            </label>
            <Input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="e.g., 123456789"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Zone */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Zone
            </label>
            <Input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g., Asia"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Server ID */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Server ID
            </label>
            <Input
              type="text"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="e.g., server_asia_1"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* Stock Diamond */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              Stock Diamond
            </label>
            <Input
              type="number"
              value={stockDiamond}
              onChange={(e) => setStockDiamond(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
          </div>

          {/* WDP Days */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-2 block">
              WDP Days
            </label>
            <Input
              type="number"
              value={wdpDays}
              onChange={(e) => setWdpDays(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              min="0"
              className={inventoryUnderlineInputClass}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 font-sans mt-2">
              1 day equals 20 diamonds. 1 WDP equals 80 instant diamonds plus 7 WDP days.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => prev + 80);
                  setWdpDays((prev) => prev + 7);
                }}
                className={inventoryStepButtonClass}
                disabled={isLoading}
              >
                + 1 WDP
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStockDiamond((prev) => Math.max(0, prev - 80));
                  setWdpDays((prev) => Math.max(0, prev - 7));
                }}
                variant="secondary"
                className={inventoryStepButtonClass}
                disabled={isLoading}
              >
                - 1 WDP
              </Button>
            </div>
          </div>

          {/* Is Active Status */}
          <div>
            <label className="text-xs font-semibold text-charcoal font-sans uppercase tracking-wide mb-3 block">
              Status
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setIsActive(true)}
                disabled={isLoading}
                variant={isActive ? 'primary' : 'secondary'}
                className={cn('flex-1 h-auto px-4 py-2 text-sm', !isActive && 'text-gray-700')}
              >
                Active
              </Button>
              <Button
                type="button"
                onClick={() => setIsActive(false)}
                disabled={isLoading}
                variant={!isActive ? 'primary' : 'secondary'}
                className={cn('flex-1 h-auto px-4 py-2 text-sm', isActive && 'text-gray-700')}
              >
                Inactive
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="secondary"
              className={inventoryModalActionClass}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={inventoryModalActionClass}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
      </form>
    </Modal>
  );
};

export default Inventory;
