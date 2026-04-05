import { create } from 'zustand';

/**
 * Cashier Store - Order COMBO State Management
 * Handles selection of accounts for combo orders and order details
 */

export interface CashierStore {
  // State
  selectedAccounts: string[]; // Array of account IDs
  targetId: string;
  serverId: string;
  totalDiamond: number;
  buyerName: string; // NEW: Name of buyer/customer
  itemName: string; // NEW: Name of product/item (e.g., Starlight Card)
  quantity: number; // NEW: Quantity of items (default: 1)

  // Actions
  toggleAccountSelection: (accountId: string) => void;
  setTarget: (targetId: string, serverId: string) => void;
  setTotalDiamond: (amount: number) => void;
  setBuyerName: (name: string) => void; // NEW
  setItemName: (name: string) => void; // NEW
  setQuantity: (qty: number) => void; // NEW
  resetCashier: () => void;

  // Computed (optional helper)
  isAccountSelected: (accountId: string) => boolean;
}

// Initial state
const initialState = {
  selectedAccounts: [],
  targetId: '',
  serverId: '',
  totalDiamond: 0,
  buyerName: '',
  itemName: '',
  quantity: 1,
};

export const useCashierStore = create<CashierStore>((set, get) => ({
  // State
  ...initialState,

  // Actions
  toggleAccountSelection: (accountId: string) => {
    set((state) => {
      const isSelected = state.selectedAccounts.includes(accountId);

      if (isSelected) {
        // Remove account if already selected
        return {
          selectedAccounts: state.selectedAccounts.filter(
            (id) => id !== accountId
          ),
        };
      } else {
        // Add account if not selected
        return {
          selectedAccounts: [...state.selectedAccounts, accountId],
        };
      }
    });
  },

  setTarget: (targetId: string, serverId: string) => {
    set({
      targetId,
      serverId,
    });
  },

  setTotalDiamond: (amount: number) => {
    // Ensure amount is non-negative
    const validAmount = Math.max(0, amount);
    set({
      totalDiamond: validAmount,
    });
  },

  setBuyerName: (name: string) => {
    set({ buyerName: name });
  },

  setItemName: (name: string) => {
    set({ itemName: name });
  },

  setQuantity: (qty: number) => {
    // Ensure quantity is at least 1
    const validQty = Math.max(1, qty);
    set({ quantity: validQty });
  },

  resetCashier: () => {
    set(initialState);
  },

  // Computed helper
  isAccountSelected: (accountId: string) => {
    return get().selectedAccounts.includes(accountId);
  },
}));
