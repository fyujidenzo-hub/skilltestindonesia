import { useEffect, useMemo, useState } from "react";
import type { Navigate } from "../App";
import AccountPanel from "../components/admin/AccountPanel";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminToolbar from "../components/admin/AdminToolbar";
import CatalogAdmin from "../components/admin/CatalogAdmin";
import FinanceTable from "../components/admin/FinanceTable";
import MemberTable from "../components/admin/MemberTable";
import OrderTable from "../components/admin/OrderTable";
import OverviewPanel from "../components/admin/OverviewPanel";
import StaffPanel from "../components/admin/StaffPanel";
import type { AdminTab } from "../constants";
import { allowedTabsForRole, clearActiveAdminId, getActiveAdmin } from "../services/adminSession";
import { useAppStore } from "../store/AppStore";

export default function AdminPage({ navigate }: { navigate: Navigate }) {
  const { state, persistence } = useAppStore();
  const activeAdmin = getActiveAdmin(state.admins);
  const allowedTabs = useMemo<readonly AdminTab[]>(() => allowedTabsForRole(activeAdmin?.role), [activeAdmin?.role]);
  const [activeTab, setActiveTab] = useState<AdminTab>("Overview");
  const [query, setQuery] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("All admins");

  useEffect(() => {
    if (!activeAdmin) navigate("/admin/login");
  }, [activeAdmin, navigate]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) setActiveTab(allowedTabs[0]);
  }, [activeTab, allowedTabs]);

  const visibleAdmins = useMemo(() => {
    if (!activeAdmin) return [];
    return activeAdmin.role === "super_admin" ? state.admins : state.admins.filter((admin) => admin.id === activeAdmin.id);
  }, [activeAdmin, state.admins]);

  const totals = useMemo(() => {
    const adminScope = selectedAdmin === "All admins" ? visibleAdmins : visibleAdmins.filter((admin) => admin.name === selectedAdmin);
    return {
      registrations: adminScope.reduce((sum, admin) => sum + admin.registrations, 0),
      todayDeposits: adminScope.reduce((sum, admin) => sum + admin.todayDeposits, 0),
      monthDeposits: adminScope.reduce((sum, admin) => sum + admin.monthDeposits, 0),
      todayWithdrawals: adminScope.reduce((sum, admin) => sum + admin.todayWithdrawals, 0),
      monthWithdrawals: adminScope.reduce((sum, admin) => sum + admin.monthWithdrawals, 0),
    };
  }, [selectedAdmin, visibleAdmins]);

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
    const ownerAdmin = transaction.admin || state.members.find((member) => member.username === transaction.member)?.referredBy;
    const adminMatch =
      activeAdmin?.role === "super_admin" && selectedAdmin === "All admins"
        ? true
        : ownerAdmin
          ? scopedAdminNames.includes(ownerAdmin)
          : false;
    const textMatch = `${transaction.member} ${transaction.type} ${transaction.status}`.toLowerCase().includes(query.toLowerCase());
    return adminMatch && textMatch;
  });

  const selectedAdminCode =
    selectedAdmin === "All admins"
      ? visibleAdmins[0]?.invitationCode ?? visibleAdmins[0]?.code ?? ""
      : visibleAdmins.find((admin) => admin.name === selectedAdmin)?.invitationCode ?? visibleAdmins.find((admin) => admin.name === selectedAdmin)?.code ?? visibleAdmins[0]?.invitationCode ?? visibleAdmins[0]?.code ?? "";
  const selectedAdminDisplayCode =
    selectedAdmin === "All admins"
      ? visibleAdmins[0]?.adminCode ?? visibleAdmins[0]?.code ?? ""
      : visibleAdmins.find((admin) => admin.name === selectedAdmin)?.adminCode ?? visibleAdmins.find((admin) => admin.name === selectedAdmin)?.code ?? visibleAdmins[0]?.adminCode ?? visibleAdmins[0]?.code ?? "";

  if (!activeAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-cloud text-ink">
      <AdminHeader
        activeAdmin={activeAdmin}
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
            onSelectedAdminChange={setSelectedAdmin}
            onQueryChange={setQuery}
          />
          {activeTab === "Overview" && <OverviewPanel state={state} totals={totals} />}
          {activeTab === "Members" && <MemberTable members={filteredMembers} />}
          {activeTab === "Orders" && <OrderTable orders={filteredOrders} members={filteredMembers} products={state.products} />}
          {activeTab === "Finance" && <FinanceTable transactions={filteredTransactions} members={state.members} canApprove={activeAdmin.role === "super_admin"} />}
          {activeTab === "Catalog" && <CatalogAdmin products={state.products} />}
          {activeTab === "Staff" && <StaffPanel admins={state.admins} />}
          {activeTab === "Account" && <AccountPanel account={state.account} />}
        </section>
      </div>
    </main>
  );
}
