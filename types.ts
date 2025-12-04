
export enum TransactionStatus {
  COMPLETED = 'Concluído',
  PENDING = 'Pendente',
  FAILED = 'Falhou',
  REFUNDED = 'Estornado',
  PAID = 'Pago' // Often returned by gateways
}

export enum TransactionType {
  CREDIT = 'Crédito',
  DEBIT = 'Débito',
  PIX_IN = 'PIX_IN',
  PIX_OUT = 'PIX_OUT'
}

export interface Transaction {
  id: string;
  amount: number;
  description: string; // Mapped from backend description or type
  date: string;        // created_at
  status: TransactionStatus | string;
  type: TransactionType | string;
  sender?: string;     // If available
  recipient?: string;  // If available
  balanceAfter?: number; // Wallet balance after this transaction, if provided
  e2e?: string; // End-to-end ID (e.g., PIX tradeNo)
  document?: string; // Raw document from ledger/meta
  payerName?: string; // PIX payer name from meta
  providerOrderNo?: string; // Provider external id
  // Legacy fields kept for compatibility if needed, but marked optional
  customerName?: string;
  pixKey?: string;
}

export interface MedSummary {
  openCount: number;
  blockedAmount: number;
  totalCount: number;
  hasMed: boolean;
}

export interface MedAlert {
  id: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'DEFENSE_SENT' | 'ACCEPTED' | 'REJECTED' | 'ANALYSIS' | 'CONCLUDED' | 'CANCELLED';
  requesterBank: string;
  openedAt: string;
  deadline: string;
}

export interface UserFees {
  userId: number;
  pixInPercent: number;
  pixOutPercent: number;
}

export interface User {
  id: string;
  _id?: string; 

  name: string;
  email: string;

  personType?: 'PF' | 'PJ';
  document?: string;
  cnpj?: string;
  companyName?: string;
  tradeName?: string;
  partnerName?: string;

  role?: string;
  status?: string;

  
  doc_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  docStatus?: string; 

  
  appId?: string;
  clientSecret?: string;

  app_id?: string;
  app_secret_hash?: string;

  [key: string]: any; 
}

export interface WalletData {
  userId: string | number;
  currency: string;
  balance: number;
  blockedBalance?: number;
}


export interface ApiCredentials {
  appId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  webhookUrl: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type ViewState =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'transactions'
  | 'settings'
  | 'integration'
  | 'pix'
  | 'withdraw'
  | 'payment-links'
  | 'med'
  | 'fees'
  | 'crypto';


export interface AuthResponse {
  token: string;         
  access_token?: string; 
  user: User;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  personType: 'PF' | 'PJ';
  document?: string;    
  cnpj?: string;        
  companyName?: string; 
  tradeName?: string;   
  partnerName?: string; 
  externalId?: string;
}


export function normalizeUser(raw: any): User {
  if (!raw) return raw as User;

  const user: User = {
    ...raw,
    id: String(raw.id ?? raw._id ?? ''),
    appId: raw.appId ?? raw.app_id ?? raw.app_id,
    clientSecret: raw.clientSecret ?? raw.app_secret_hash ?? raw.client_secret
  };


  if (!user.docStatus && raw.doc_status) {
    user.docStatus = raw.doc_status;
  }

  return user;
}

export function buildApiCredentialsFromUser(
  user: User,
  options?: { environment?: 'sandbox' | 'production'; webhookUrl?: string }
): ApiCredentials | null {
  const appId = user.appId ?? user.app_id;
  const clientSecret = user.clientSecret ?? user.app_secret_hash;

  if (!appId || !clientSecret) return null;

  return {
    appId,
    clientSecret,
    environment: options?.environment ?? 'production',
    webhookUrl: options?.webhookUrl ?? ''
  };
}