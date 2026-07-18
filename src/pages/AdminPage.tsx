import { useEffect, useMemo, useState } from "react";
import type { Navigate } from "../App";
import AccountPanel from "../components/admin/AccountPanel";
import AdminHeader, { type AdminNotification } from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminToolbar from "../components/admin/AdminToolbar";
import CatalogAdmin from "../components/admin/CatalogAdmin";
import TransactionManagementTable from "../components/admin/TransactionManagementTable";
import MemberTable from "../components/admin/MemberTable";
import OrderTable from "../components/admin/OrderTable";
import OverviewPanel from "../components/admin/OverviewPanel";
import TaskAssignmentTable from "../components/admin/TaskAssignmentTable";
import StaffPanel from "../components/admin/StaffPanel";
import type { AdminTab } from "../constants";
import { allowedTabsForRole, clearActiveAdminId, getActiveAdmin } from "../services/adminSession";
import { loadStoredState } from "../services/appStateRepository";
import { useAppStore } from "../store/AppStore";
import type { AppState, Member, StaffAdmin, Transaction } from "../types";

export default function AdminPage({ navigate }: { navigate: Navigate }) {
  const { state, persistence, ready, dispatch } = useAppStore();
  const activeAdmin = getActiveAdmin(state.admins);
  const allowedTabs = useMemo<readonly AdminTab[]>(() => allowedTabsForRole(activeAdmin?.role), [activeAdmin?.role]);
  const [activeTab, setActiveTab] = useState<AdminTab>("Overview");
  const [query, setQuery] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("All admins");
  const [refreshingModule, setRefreshingModule] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!activeAdmin) navigate("/admin/login");
  }, [activeAdmin, navigate, ready]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) setActiveTab(allowedTabs[0]);
  }, [activeTab, allowedTabs]);

  const visibleAdmins = useMemo(() => {
    if (!activeAdmin) return [];
    return activeAdmin.role === "super_admin" ? state.admins : state.admins.filter((admin) => admin.id === activeAdmin.id);
  }, [activeAdmin, state.admins]);

  const selectedAdminScope = useMemo(() => {
    return selectedAdmin === "All admins" ? visibleAdmins : visibleAdmins.filter((admin) => admin.name === selectedAdmin);
  }, [selectedAdmin, visibleAdmins]);

  const scopedMembersForOverview = useMemo(() => {
    return state.members.filter((member) => selectedAdminScope.some((admin) => memberBelongsToAdmin(member, admin)));
  }, [selectedAdminScope, state.members]);

  const scopedTransactionsForOverview = useMemo(() => {
    return state.transactions.filter((transaction) => selectedAdminScope.some((admin) => transactionBelongsToAdmin(transaction, admin, state.members)));
  }, [selectedAdminScope, state.members, state.transactions]);

  const overviewAdmins = useMemo(() => {
    return selectedAdminScope.map((admin) => buildAdminMetrics(admin, state.members, state.transactions));
  }, [selectedAdminScope, state.members, state.transactions]);

  const overviewState = useMemo<AppState>(() => {
    return {
      ...state,
      admins: overviewAdmins,
      members: scopedMembersForOverview,
      transactions: scopedTransactionsForOverview,
    };
  }, [overviewAdmins, scopedMembersForOverview, scopedTransactionsForOverview, state]);

  const totals = useMemo(() => {
    const adminScope = overviewAdmins;
    return {
      registrations: adminScope.reduce((sum, admin) => sum + admin.registrations, 0),
      todayDeposits: adminScope.reduce((sum, admin) => sum + admin.todayDeposits, 0),
      monthDeposits: adminScope.reduce((sum, admin) => sum + admin.monthDeposits, 0),
      todayWithdrawals: adminScope.reduce((sum, admin) => sum + admin.todayWithdrawals, 0),
      monthWithdrawals: adminScope.reduce((sum, admin) => sum + admin.monthWithdrawals, 0),
    };
  }, [overviewAdmins]);

  const filteredMembers = state.members.filter((member) => {
    const adminMatch =
      activeAdmin?.role === "super_admin"
        ? selectedAdmin === "All admins" || member.referredBy === selectedAdmin
        : member.referredBy === activeAdmin?.name;
    const textMatch = `${member.username} ${member.phone} ${member.invitationCode}`.toLowerCase().includes(query.toLowerCase());
    return adminMatch && textMatch;
  });

  const scopedAdminNames = useMemo(() => {
    if (!activeAdmin) return [];
    if (activeAdmin.role !== "super_admin") return [activeAdmin.name];
    return selectedAdmin === "All admins" ? visibleAdmins.map((admin) => admin.name) : [selectedAdmin];
  }, [activeAdmin, selectedAdmin, visibleAdmins]);

  const filteredOrders = state.orders.filter((order) => {
    const ownerAdmin = order.admin ?? state.members.find((member) => member.username === order.member)?.referredBy;
    const adminMatch = ownerAdmin ? scopedAdminNames.includes(ownerAdmin) : activeAdmin?.role === "super_admin" && selectedAdmin === "All admins";
    const textMatch = `${order.member} ${order.productCode} ${order.productName}`.toLowerCase().includes(query.toLowerCase());
    return adminMatch && textMatch;
  });

  const filteredTransactions = state.transactions.filter((transaction) => {
    const adminMatch = scopedAdminNames.some((adminName) => transaction.admin === adminName || state.members.find((member) => member.username === transaction.member)?.referredBy === adminName);
    const textMatch = `${transaction.requestId ?? ""} ${transaction.member} ${transaction.admin} ${transaction.senderName ?? ""} ${transaction.type} ${transaction.status}`.toLowerCase().includes(query.toLowerCase());
    return adminMatch && textMatch;
  });

  const adminNotifications = useMemo(() => {
    return buildAdminNotifications(scopedMembersForOverview, scopedTransactionsForOverview, filteredOrders);
  }, [filteredOrders, scopedMembersForOverview, scopedTransactionsForOverview]);

  const selectedAdminCode =
    selectedAdmin === "All admins"
      ? activeAdmin?.invitationCode ?? activeAdmin?.code ?? visibleAdmins[0]?.invitationCode ?? visibleAdmins[0]?.code ?? ""
      : visibleAdmins.find((admin) => admin.name === selectedAdmin)?.invitationCode ?? visibleAdmins.find((admin) => admin.name === selectedAdmin)?.code ?? visibleAdmins[0]?.invitationCode ?? visibleAdmins[0]?.code ?? "";
  const selectedAdminDisplayCode =
    selectedAdmin === "All admins"
      ? activeAdmin?.adminCode ?? activeAdmin?.code ?? visibleAdmins[0]?.adminCode ?? visibleAdmins[0]?.code ?? ""
      : visibleAdmins.find((admin) => admin.name === selectedAdmin)?.adminCode ?? visibleAdmins.find((admin) => admin.name === selectedAdmin)?.code ?? visibleAdmins[0]?.adminCode ?? visibleAdmins[0]?.code ?? "";

  const refreshAdminData = async (module: string) => {
    setRefreshingModule(module);
    try {
      const latestState = await loadStoredState();
      dispatch({ type: "hydrate", payload: latestState });
    } finally {
      setRefreshingModule("");
    }
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-cloud text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Memulihkan sesi admin...</div>
      </main>
    );
  }

  if (!activeAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-cloud text-ink">
      <AdminHeader
        activeAdmin={activeAdmin}
        notifications={adminNotifications}
        navigate={navigate}
        onLogout={() => {
          clearActiveAdminId();
          navigate("/admin/login");
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_1fr]">
        <AdminSidebar activeTab={activeTab} tabs={allowedTabs} persistence={persistence} onTabChange={setActiveTab} />
        <section className="min-w-0">
          <AdminToolbar
            admins={visibleAdmins}
            registrationCode={selectedAdminCode}
            adminCode={selectedAdminDisplayCode}
            selectedAdmin={selectedAdmin}
            query={query}
            siteUrl={state.account.siteUrl}
            onSelectedAdminChange={setSelectedAdmin}
            onQueryChange={setQuery}
          />
          {activeTab === "Overview" && <OverviewPanel state={overviewState} totals={totals} canManageBanks={activeAdmin.role === "super_admin"} />}
            {activeTab === "Members" && (
              <MemberTable
                members={filteredMembers}
                canManageMemberFinance={activeAdmin.role === "super_admin"}
                canManageWithdrawalLock={activeAdmin.role === "super_admin"}
              />
            )}
          {activeTab === "Tasks" && <TaskAssignmentTable orders={filteredOrders} members={filteredMembers} products={state.products} onRefresh={() => refreshAdminData("sequence")} isRefreshing={refreshingModule === "sequence"} />}
          {activeTab === "Orders" && <OrderTable orders={filteredOrders} members={filteredMembers} products={state.products} onRefresh={() => refreshAdminData("orders")} isRefreshing={refreshingModule === "orders"} />}
          {activeTab === "Finance" && <TransactionManagementTable transactions={filteredTransactions} members={state.members} canApprove={activeAdmin.role === "super_admin"} onRefresh={(module) => refreshAdminData(module)} refreshingModule={refreshingModule} />}
          {activeTab === "Catalog" && <CatalogAdmin products={state.products} />}
          {activeTab === "Staff" && <StaffPanel admins={state.admins} />}
          {activeTab === "Account" && <AccountPanel activeAdmin={activeAdmin} />}
        </section>
      </div>
    </main>
  );
}

function buildAdminMetrics(admin: StaffAdmin, members: Member[], transactions: Transaction[]): StaffAdmin {
  const adminMembers = members.filter((member) => memberBelongsToAdmin(member, admin));
  const adminTransactions = transactions.filter((transaction) => transactionBelongsToAdmin(transaction, admin, members));
  const countedTransactions = adminTransactions.filter((transaction) => transaction.status !== "rejected");

  return {
    ...admin,
    registrations: adminMembers.length,
    todayDeposits: sumTransactions(countedTransactions, "topup", "today"),
    monthDeposits: sumTransactions(countedTransactions, "topup", "month"),
    todayWithdrawals: sumTransactions(countedTransactions, "withdrawal", "today"),
    monthWithdrawals: sumTransactions(countedTransactions, "withdrawal", "month"),
  };
}

function memberBelongsToAdmin(member: Member, admin: StaffAdmin) {
  const codes = [admin.code, admin.adminCode, admin.invitationCode].filter(Boolean);
  return member.referredBy === admin.name || codes.includes(member.invitationCode);
}

function transactionBelongsToAdmin(transaction: Transaction, admin: StaffAdmin, members: Member[]) {
  const codes = [admin.code, admin.adminCode, admin.invitationCode].filter(Boolean);
  if (transaction.admin === admin.name || codes.includes(transaction.admin)) return true;
  const member = members.find((item) => item.username === transaction.member);
  return member ? memberBelongsToAdmin(member, admin) : false;
}

function sumTransactions(transactions: Transaction[], type: Transaction["type"], period: "today" | "month") {
  return transactions
    .filter((transaction) => transaction.type === type && isInPeriod(transaction.createdAt, period))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function isInPeriod(value: string, period: "today" | "month") {
  const date = parseRecordDate(value);
  if (!date) return false;

  const now = new Date();
  if (period === "today") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function parseRecordDate(value: string) {
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildAdminNotifications(members: Member[], transactions: Transaction[], orders: AppState["orders"]): AdminNotification[] {
  const registrationNotifications = members.map((member) => ({
    id: `member-${member.id}`,
    title: "New registration",
    text: `${member.username} registered under ${member.referredBy || "admin scope"}.`,
    time: member.lastLogin,
    tone: "registration" as const,
    sortTime: parseRecordDate(member.lastLogin)?.getTime() ?? 0,
  }));

  const transactionNotifications = transactions
    .filter((transaction) => transaction.status === "pending")
    .map((transaction) => ({
      id: `transaction-${transaction.id}`,
      title: transaction.type === "topup" ? "New Top Up request" : transaction.type === "withdrawal" ? "Permintaan penarikan baru" : "Imbalan saldo baru",
      text: `${transaction.member} requested ${formatNotificationAmount(transaction.amount)}. Status: Pending.`,
      time: transaction.createdAt,
      tone: transaction.type === "topup" ? ("topup" as const) : transaction.type === "withdrawal" ? ("withdrawal" as const) : ("completed" as const),
      sortTime: parseRecordDate(transaction.createdAt)?.getTime() ?? 0,
    }));

  const orderNotifications = orders
    .filter((order) => getAdminOrderStatus(order) !== "completed")
    .map((order) => ({
      id: `order-${order.id}`,
      title: getAdminOrderStatus(order) === "pending" ? "Pesanan menunggu penugasan" : "Pesanan sedang diproses",
      text: `${order.member} has ${order.productName ? order.productName : "tugas pesanan"} tertunda.`,
      waktu: order.createdAt,
      tone: "order" as const,
      sortTime: parseRecordDate(order.createdAt)?.getTime() ?? 0,
    }));

  const completedOrderNotifications = orders
    .filter((order) => getAdminOrderStatus(order) === "completed")
    .map((order) => ({
      id: `completed-order-${order.id}`,
      title: "Order completed",
      text: `${order.member} completed ${order.productName || "sebuah tugas pemesanan"}.`,
      time: order.completedAt ?? order.createdAt,
      tone: "completed" as const,
      sortTime: parseRecordDate(order.completedAt ?? order.createdAt)?.getTime() ?? 0,
    }));

  return [...registrationNotifications, ...transactionNotifications, ...orderNotifications, ...completedOrderNotifications]
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, 12)
    .map(({ sortTime: _sortTime, ...notification }) => notification);
}

function getAdminOrderStatus(order: AppState["orders"][number]) {
  return order.status === "diserahkan" || order.status === "completed" ? "completed" : "pending";
}

function formatNotificationAmount(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
