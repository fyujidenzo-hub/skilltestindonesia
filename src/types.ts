export type UserLevel = "Starter" | "Silver" | "Gold" | "VIP";
export type TransactionStatus = "pending" | "approved" | "rejected";
export type AdminRole = "super_admin" | "admin" | "employee";

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
  type: "topup" | "withdrawal";
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  senderName?: string;
  proofName?: string;
  proofType?: string;
}

export interface Order {
  id: string;
  referenceNumber?: string;
  memberId?: string;
  member: string;
  admin?: string;
  productCode?: string;
  productName?: string;
  value: number;
  commission: number;
  requiredBalance?: number;
  status: "waiting" | "assigned" | "completed" | "frozen";
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
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
  };
}
