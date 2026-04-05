export interface Account {
    id: number;
    name: string;
    game_id: string;
    zone: string;
    server_id: string;
    stock_diamond: number;
    pending_wdp: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deficit_diamond: number;
    real_diamond: number;
    potential_diamond: number;
    wdp_potential_capped: number;
    tracked_wdp_days_approx: number;
    classification: string;
}
export interface CreateAccountPayload {
    name: string;
    game_id: string;
    zone: string;
    server_id: string;
    stock_diamond: number;
    pending_wdp: number;
    is_active: boolean;
}
export declare const useAccounts: () => import("@tanstack/react-query").UseQueryResult<Account[], Error>;
export declare const fetchAccounts: () => Promise<Account[]>;
export declare const updateAccount: (id: number, payload: Partial<CreateAccountPayload>) => Promise<Account>;
