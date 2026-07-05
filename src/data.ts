import type { AppState } from "./types";

export const initialState: AppState = {
  admins: [
    { id: "a0", name: "Super Admin", code: "000001", adminCode: "000001", invitationCode: "000001", registrationBonus: 0, registrations: 0, todayDeposits: 0, monthDeposits: 0, todayWithdrawals: 0, monthWithdrawals: 0, username: "superadmin", password: "super123", role: "super_admin" },
    { id: "a1", name: "Admin 1", code: "346192", adminCode: "001", invitationCode: "346192", registrationBonus: 25000, registrations: 5, todayDeposits: 3200000, monthDeposits: 48300000, todayWithdrawals: 1250000, monthWithdrawals: 21900000, username: "admin1", password: "admin123", role: "admin" },
    { id: "a2", name: "Admin 2", code: "924894", adminCode: "002", invitationCode: "924894", registrationBonus: 35000, registrations: 10, todayDeposits: 5600000, monthDeposits: 76600000, todayWithdrawals: 2100000, monthWithdrawals: 34250000, username: "employee1", password: "employee123", role: "employee" },
    { id: "a3", name: "Admin 3", code: "618076", adminCode: "003", invitationCode: "618076", registrationBonus: 45000, registrations: 12, todayDeposits: 7350000, monthDeposits: 90450000, todayWithdrawals: 3900000, monthWithdrawals: 42100000, username: "admin3", password: "admin123", role: "admin" },
  ],
  members: [
    { id: "14991", username: "raka.pratama", email: "raka@example.com", phone: "081375323198", invitationCode: "924894", referredBy: "Admin 2", level: "VIP", balance: 0, totalOrders: 14, lastLogin: "2026-06-14 19:42" },
    { id: "14864", username: "maya.putri", email: "maya@example.com", phone: "08173045642", invitationCode: "346192", referredBy: "Admin 1", level: "Gold", balance: 80800, totalOrders: 7, lastLogin: "2026-06-14 18:13" },
    { id: "14815", username: "dimas.store", email: "dimas@example.com", phone: "082198765431", invitationCode: "618076", referredBy: "Admin 3", level: "Silver", balance: 225000, totalOrders: 21, lastLogin: "2026-06-13 22:04" },
  ],
  products: [
    { id: "p1", code: "OPR-5256", name: "OPPO Reno15 5G 8/256GB", price: 7699000, commission: 1539800, requiredBalance: 500000, quantity: 42, category: "Electronics", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80" },
    { id: "p2", code: "NTR-220", name: "Nutrition Bundle 220g", price: 284000, commission: 42600, requiredBalance: 0, quantity: 118, category: "Health", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80" },
    { id: "p3", code: "HME-774", name: "Smart Home Starter Kit", price: 1299000, commission: 194850, requiredBalance: 100000, quantity: 63, category: "Home", image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80" },
    { id: "p4", code: "FAS-118", name: "Daily Essentials Pack", price: 179000, commission: 26850, requiredBalance: 0, quantity: 230, category: "Lifestyle", image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80" },
  ],
  banks: [
    { id: "b1", bank: "BCA", accountName: "OrderOps Indonesia", accountNumber: "8810 4455 2100", minDeposit: 100000, active: true },
    { id: "b2", bank: "Mandiri", accountName: "OrderOps Indonesia", accountNumber: "1330 9900 4432", minDeposit: 100000, active: true },
    { id: "b3", bank: "BNI", accountName: "OrderOps Indonesia", accountNumber: "7621 4040 9001", minDeposit: 250000, active: false },
  ],
  transactions: [
    { id: "t1", member: "maya.putri", admin: "Admin 1", type: "topup", amount: 80800, status: "approved", createdAt: "2026-06-14 08:30" },
    { id: "t2", member: "dimas.store", admin: "Admin 3", type: "withdrawal", amount: 450000, status: "pending", createdAt: "2026-06-14 11:18" },
    { id: "t3", member: "raka.pratama", admin: "Admin 2", type: "withdrawal", amount: 1250000, status: "rejected", createdAt: "2026-06-13 16:50" },
    { id: "t4", member: "nina.sales", admin: "Admin 2", type: "topup", amount: 1200000, status: "pending", createdAt: "2026-06-14 15:11" },
  ],
  orders: [
    { id: "o1", member: "maya.putri", productCode: "OPR-5256", productName: "OPPO Reno15 5G 8/256GB", value: 7699000, commission: 1539800, status: "assigned", createdAt: "2026-06-14 10:20" },
    { id: "o2", member: "dimas.store", productCode: "NTR-220", productName: "Nutrition Bundle 220g", value: 284000, commission: 42600, status: "completed", createdAt: "2026-06-14 09:05" },
    { id: "o3", member: "raka.pratama", productCode: "HME-774", productName: "Smart Home Starter Kit", value: 1299000, commission: 194850, status: "frozen", createdAt: "2026-06-13 21:44" },
  ],
  account: {
    username: "operations.owner",
    password: "admin123",
    withdrawalPassword: "000000",
    siteUrl: "https://skilltestindonesia.com",
    customerServiceTelegramUrl: "",
  },
};
