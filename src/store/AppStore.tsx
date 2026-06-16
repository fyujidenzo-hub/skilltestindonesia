import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { firebaseReady } from "../firebase";
import { loadStoredState, saveStoredState } from "../services/appStateRepository";
import type { AppState, BankPlacement, Member, Product, Transaction } from "../types";

type Action =
  | { type: "hydrate"; payload: AppState }
  | { type: "registerMember"; payload: Omit<Member, "id" | "level" | "balance" | "totalOrders" | "lastLogin" | "referredBy"> }
  | { type: "createTransaction"; payload: Pick<Transaction, "member" | "type" | "amount"> }
  | { type: "updateTransaction"; payload: { id: string; status: "approved" | "rejected" } }
  | { type: "createOrder"; payload: { member: string; productId: string } }
  | { type: "completeOrder"; payload: { orderId: string } }
  | { type: "addProduct"; payload: Omit<Product, "id"> }
  | { type: "addBank"; payload: Omit<BankPlacement, "id"> }
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
    const admin = state.admins.find((item) => item.code === action.payload.invitationCode) ?? state.admins[0];
    const member: Member = {
      ...action.payload,
      id: String(Date.now()).slice(-6),
      referredBy: admin.name,
      level: "Starter",
      balance: 0,
      totalOrders: 0,
      lastLogin: nowStamp(),
    };

    return {
      ...state,
      members: [member, ...state.members],
      admins: state.admins.map((item) => (item.id === admin.id ? { ...item, registrations: item.registrations + 1 } : item)),
    };
  }

  if (action.type === "createTransaction") {
    const member = state.members.find((item) => item.username === action.payload.member) ?? state.members[0];
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
    return {
      ...state,
      transactions: state.transactions.map((item) => (item.id === action.payload.id ? { ...item, status: action.payload.status } : item)),
      members:
        action.payload.status === "approved"
          ? state.members.map((member) =>
              member.username === transaction.member ? { ...member, balance: Math.max(0, member.balance + signedAmount) } : member,
            )
          : state.members,
    };
  }

  if (action.type === "createOrder") {
    const product = state.products.find((item) => item.id === action.payload.productId);
    const member = state.members.find((item) => item.username === action.payload.member);
    if (!product || !member || product.quantity <= 0) return state;

    return {
      ...state,
      products: state.products.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity - 1 } : item)),
      members: state.members.map((item) => (item.id === member.id ? { ...item, totalOrders: item.totalOrders + 1 } : item)),
      orders: [
        {
          id: nextId("ord"),
          member: member.username,
          productCode: product.code,
          productName: product.name,
          value: product.price,
          commission: product.commission,
          status: "assigned",
          createdAt: nowStamp(),
        },
        ...state.orders,
      ],
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

  if (action.type === "addProduct") return { ...state, products: [{ ...action.payload, id: nextId("prod") }, ...state.products] };
  if (action.type === "addBank") return { ...state, banks: [{ ...action.payload, id: nextId("bank") }, ...state.banks] };
  if (action.type === "updateAccount") return { ...state, account: action.payload };

  return state;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    admins: [],
    members: [],
    products: [],
    banks: [],
    transactions: [],
    orders: [],
    account: { username: "", password: "", withdrawalPassword: "" },
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
      .catch(() => setReady(true));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void saveStoredState(state);
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
