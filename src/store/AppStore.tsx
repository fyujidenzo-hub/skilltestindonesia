import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { firebaseReady } from "../firebase";
import { initialState } from "../data";
import { loadStoredState, saveLocalState } from "../services/appStateRepository";
import type { AppState, BankPlacement, Member, Order, Product, StaffAdmin, Transaction } from "../types";

type RegisterMemberPayload = {
  id?: string;
  username: string;
  email?: string;
  phone: string;
  invitationCode: string;
  accountPassword: string;
  withdrawalPassword: string;
};

type Action =
  | { type: "hydrate"; payload: AppState }
  | { type: "registerMember"; payload: RegisterMemberPayload }
  | { type: "createTransaction"; payload: Pick<Transaction, "member" | "type" | "amount"> }
  | { type: "addTransaction"; payload: Transaction }
  | { type: "updateTransaction"; payload: { id: string; status: "approved" | "rejected" } }
  | { type: "updateMember"; payload: Member }
  | { type: "createOrder"; payload: { member: string; productId?: string } }
  | { type: "addOrder"; payload: Order }
  | { type: "updateOrder"; payload: Order }
  | { type: "completeOrder"; payload: { orderId: string } }
  | { type: "completeOrderWithMember"; payload: { order: Order; member: Member } }
  | { type: "addProduct"; payload: Omit<Product, "id"> & { id?: string } }
  | { type: "addBank"; payload: Omit<BankPlacement, "id"> & { id?: string } }
  | { type: "addAdmin"; payload: StaffAdmin }
  | { type: "updateAccount"; payload: AppState["account"] };

interface AppStoreValue {
  state: AppState;
  ready: boolean;
  persistence: "firebase" | "local";
  dispatch: React.Dispatch<Action>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
}

function reducer(state: AppState, action: Action): AppState {
  if (action.type === "hydrate") return action.payload;

  if (action.type === "registerMember") {
    const admin = state.admins.find((item) => (item.invitationCode ?? item.code) === action.payload.invitationCode);
    if (!admin) return state;
    const member: Member = {
      id: action.payload.id ?? String(Date.now()).slice(-6),
      username: action.payload.username,
      email: action.payload.email,
      phone: action.payload.phone,
      invitationCode: action.payload.invitationCode,
      referredBy: admin.name,
      level: "Starter",
      balance: admin.registrationBonus ?? 0,
      totalOrders: 0,
      lastLogin: nowStamp(),
      accountPassword: action.payload.accountPassword,
      withdrawalPassword: action.payload.withdrawalPassword,
    };

    return {
      ...state,
      members: [member, ...state.members],
      admins: state.admins.map((item) => (item.id === admin.id ? { ...item, registrations: item.registrations + 1 } : item)),
    };
  }

  if (action.type === "createTransaction") {
    const member = state.members.find((item) => item.username === action.payload.member) ?? state.members[0];
    if (!member) return state;
    const transaction: Transaction = {
      id: nextId("tx"),
      member: member.username,
      admin: member.referredBy,
      type: action.payload.type,
      amount: action.payload.amount,
      status: "pending",
      createdAt: nowStamp(),
    };
    return { ...state, transactions: [transaction, ...state.transactions] };
  }

  if (action.type === "updateTransaction") {
    const transaction = state.transactions.find((item) => item.id === action.payload.id);
    if (!transaction || transaction.status !== "pending") return state;

    const signedAmount = transaction.type === "topup" ? transaction.amount : -transaction.amount;
    const shouldApplyFinanceTotals = action.payload.status === "approved";
    return {
      ...state,
      transactions: state.transactions.map((item) => (item.id === action.payload.id ? { ...item, status: action.payload.status } : item)),
      admins: shouldApplyFinanceTotals
        ? state.admins.map((admin) => {
            if (admin.name !== transaction.admin) return admin;
            return transaction.type === "topup"
              ? {
                  ...admin,
                  todayDeposits: admin.todayDeposits + transaction.amount,
                  monthDeposits: admin.monthDeposits + transaction.amount,
                }
              : {
                  ...admin,
                  todayWithdrawals: admin.todayWithdrawals + transaction.amount,
                  monthWithdrawals: admin.monthWithdrawals + transaction.amount,
                };
          })
        : state.admins,
      members:
        action.payload.status === "approved"
          ? state.members.map((member) =>
              member.username === transaction.member ? { ...member, balance: Math.max(0, member.balance + signedAmount) } : member,
            )
          : state.members,
    };
  }

  if (action.type === "addTransaction") {
    return { ...state, transactions: [action.payload, ...state.transactions] };
  }

  if (action.type === "createOrder") {
    const member = state.members.find((item) => item.username === action.payload.member);
    const product = action.payload.productId ? state.products.find((item) => item.id === action.payload.productId) : undefined;
    if (!member) return state;

    const order: Order = {
      id: nextId("ord"),
      referenceNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      memberId: member.id,
      member: member.username,
      admin: member.referredBy,
      productCode: product?.code,
      productName: product?.name,
      value: product?.price ?? 0,
      commission: product?.commission ?? 0,
      requiredBalance: product?.requiredBalance ?? 0,
      status: product ? "assigned" : "waiting",
      createdAt: nowStamp(),
      assignedAt: product ? nowStamp() : undefined,
    };

    return {
      ...state,
      products: product ? state.products.map((item) => (item.id === product.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item)) : state.products,
      orders: [order, ...state.orders],
    };
  }

  if (action.type === "completeOrder") {
    const order = state.orders.find((item) => item.id === action.payload.orderId);
    if (!order || order.status !== "assigned") return state;

    return {
      ...state,
      orders: state.orders.map((item) => (item.id === order.id ? { ...item, status: "completed" } : item)),
      members: state.members.map((member) =>
        member.username === order.member ? { ...member, balance: member.balance + order.commission } : member,
      ),
    };
  }

  if (action.type === "addOrder") {
    const order = action.payload;
    return {
      ...state,
      orders: [order, ...state.orders],
      products: state.products.map((product) =>
        order.status === "assigned" && product.code === order.productCode ? { ...product, quantity: Math.max(0, product.quantity - 1) } : product,
      ),
    };
  }

  if (action.type === "updateOrder") {
    const order = action.payload;
    const previousOrder = state.orders.find((item) => item.id === order.id);
    const newlyAssigned = previousOrder?.status === "waiting" && order.status === "assigned";
    return {
      ...state,
      orders: state.orders.map((item) => (item.id === order.id ? order : item)),
      products: newlyAssigned && order.productCode
        ? state.products.map((product) =>
            product.code === order.productCode ? { ...product, quantity: Math.max(0, product.quantity - 1) } : product,
          )
        : state.products,
    };
  }

  if (action.type === "completeOrderWithMember") {
    return {
      ...state,
      orders: state.orders.map((item) => (item.id === action.payload.order.id ? action.payload.order : item)),
      members: state.members.map((member) => (member.id === action.payload.member.id ? action.payload.member : member)),
    };
  }

  if (action.type === "updateMember") {
    return {
      ...state,
      members: state.members.map((member) => (member.id === action.payload.id ? action.payload : member)),
    };
  }

  if (action.type === "addProduct") return { ...state, products: [{ ...action.payload, id: action.payload.id ?? nextId("prod") }, ...state.products] };
  if (action.type === "addBank") return { ...state, banks: [{ ...action.payload, id: action.payload.id ?? nextId("bank") }, ...state.banks] };
  if (action.type === "addAdmin") return { ...state, admins: [action.payload, ...state.admins] };
  if (action.type === "updateAccount") return { ...state, account: action.payload };

  return state;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    admins: [],
    members: [],
    products: [],
    banks: [],
    transactions: [],
    orders: [],
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadStoredState()
      .then((stored) => {
        if (!mounted) return;
        dispatch({ type: "hydrate", payload: stored });
        setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (ready) saveLocalState(state);
  }, [ready, state]);

  const value = useMemo(
    () => ({
      state,
      ready,
      persistence: firebaseReady ? ("firebase" as const) : ("local" as const),
      dispatch,
    }),
    [ready, state],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error("useAppStore must be used inside AppStoreProvider");
  return context;
}
