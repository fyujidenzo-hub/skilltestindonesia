export type UserLevel = "Starter" | "Silver" | "Gold" | "VIP";
export type TransactionStatus = "pending" | "approved" | "rejected";
export type AdminRole = "super_admin" | "admin" | "employee";
export type OrderStatus = "no_task" | "waiting_assignment" | "product_assigned" | "waiting_shipment" | "belum_diserahkan" | "diserahkan" | "waiting" | "assigned" | "completed" | "frozen" | "rejected";

export interface StaffAdmin {
  id: string;
  name: string;
  code: string;
  adminCode?: string;
  invitationCode?: string;
  registrationBonus?: number;
  registrations: number;
  todayDeposits: number;
  monthDeposits: number;
  todayWithdrawals: number;
  monthWithdrawals: number;
  username?: string;
  password?: string;
  role?: AdminRole;
}

export interface Member {
  id: string;
  username: string;
  email?: string;
  phone: string;
  invitationCode: string;
  referredBy: string;
  level: UserLevel;
  balance: number;
  totalOrders: number;
  lastLogin: string;
  accountPassword?: string;
  withdrawalPassword?: string;
  favoriteProductIds?: string[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  commission: number;
  requiredBalance?: number;
  quantity: number;
  category: string;
  image: string;
}

export interface AssignedOrderProduct {
  productId: string;
  code: string;
  name: string;
  price: number;
  commission: number;
  quantity: number;
  total: number;
}

export interface BankPlacement {
  id: string;
  bank: string;
  accountName: string;
  accountNumber: string;
  minDeposit: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  requestId?: string;
  member: string;
  admin: string;
  type: "topup" | "withdrawal" | "reward";
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  senderName?: string;
  withdrawalBankName?: string;
  withdrawalAccountName?: string;
  withdrawalAccountNumber?: string;
  proofName?: string;
  proofType?: string;
  proofDataUrl?: string;
  // SAFETY: set when an approved top-up has credited or a withdrawal has been finalized.
  creditedAt?: string;
  // SAFETY: set when a withdrawal amount was deducted immediately on request creation.
  balanceDeductedAt?: string;
}

export interface Order {
  id: string;
  referenceNumber?: string;
  memberId?: string;
  member: string;
  admin?: string;
  productCode?: string;
  productName?: string;
  quantity?: number;
  assignedProducts?: AssignedOrderProduct[];
  value: number;
  commission: number;
  requiredBalance?: number;
  status: OrderStatus;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  submittedAt?: string;
  shippedAt?: string;
  requiresCustomerApproval?: boolean;
  adminChangedAt?: string;
  rating?: number;
  review?: string;
  reviewedAt?: string;
  // SAFETY: set when this task commission has already been added to member balance.
  commissionCreditedAt?: string;
}

export interface AppState {
  admins: StaffAdmin[];
  members: Member[];
  products: Product[];
  banks: BankPlacement[];
  transactions: Transaction[];
  orders: Order[];
  account: {
    username: string;
    password: string;
    withdrawalPassword: string;
    siteUrl?: string;
    customerServiceTelegramUrl?: string;
  };
}
