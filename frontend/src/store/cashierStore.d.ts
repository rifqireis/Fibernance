/**
 * Cashier Store - Order COMBO State Management
 * Handles selection of accounts for combo orders and order details
 */
export interface CashierStore {
    selectedAccounts: string[];
    targetId: string;
    serverId: string;
    totalDiamond: number;
    buyerName: string;
    itemName: string;
    quantity: number;
    toggleAccountSelection: (accountId: string) => void;
    setTarget: (targetId: string, serverId: string) => void;
    setTotalDiamond: (amount: number) => void;
    setBuyerName: (name: string) => void;
    setItemName: (name: string) => void;
    setQuantity: (qty: number) => void;
    resetCashier: () => void;
    isAccountSelected: (accountId: string) => boolean;
}
export declare const useCashierStore: import("zustand").UseBoundStore<import("zustand").StoreApi<CashierStore>>;
