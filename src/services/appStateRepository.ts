import { firebaseReady } from "../firebase";
import { initialState } from "../data";
import type { AppState } from "../types";

const storageKey = "orderops-app-state";

const emptyAccount = {
  username: "",
  password: "",
  withdrawalPassword: "",
};

function emptyState(): AppState {
  return {
    ...initialState,
    admins: [],
    members: [],
    products: [],
    banks: [],
    transactions: [],
    orders: [],
    account: emptyAccount,
  };
}

function hasUsefulData(state: AppState) {
  return Boolean(
    state.admins.length ||
      state.members.length ||
      state.products.length ||
      state.banks.length ||
      state.transactions.length ||
      state.orders.length ||
      state.account.username,
  );
}

function mergeAdminDefaults(admins: AppState["admins"]) {
  if (!admins.length) return [];

  const enrichedAdmins = admins.map((admin) => {
    const fallback = initialState.admins.find(
      (item) => item.id === admin.id || item.code === admin.code || item.name === admin.name,
    );

    return {
      ...fallback,
      ...admin,
      code: admin.code ?? admin.invitationCode ?? fallback?.code ?? "",
      adminCode: admin.adminCode ?? admin.code ?? fallback?.adminCode ?? fallback?.code,
      invitationCode: admin.invitationCode ?? admin.code ?? fallback?.invitationCode ?? fallback?.code,
      registrationBonus: admin.registrationBonus ?? fallback?.registrationBonus ?? 0,
      username: admin.username ?? fallback?.username,
      password: admin.password ?? fallback?.password,
      role: admin.role ?? fallback?.role ?? "employee",
    };
  });

  return enrichedAdmins;
}

function mergeWithRequiredDefaults(state: AppState): AppState {
  return {
    admins: mergeAdminDefaults(state.admins),
    members: state.members,
    products: state.products,
    banks: state.banks,
    transactions: state.transactions,
    orders: state.orders,
    account: state.account.username ? state.account : emptyAccount,
  };
}

export async function loadStoredState(): Promise<AppState> {
  try {
    const { getAdmins } = await import("./adminsService");
    const { getMembers } = await import("./membersService");
    const { getProducts } = await import("./productsService");
    const { getBanks } = await import("./banksService");
    const { getTransactions } = await import("./transactionsService");
    const { getOrders } = await import("./ordersService");
    const { getSettings } = await import("./settingsService");

    const [admins, members, products, banks, transactions, orders, account] = await Promise.all([
      getAdmins(),
      getMembers(),
      getProducts(),
      getBanks(),
      getTransactions(),
      getOrders(),
      getSettings(),
    ]);

    const firestoreState: AppState = {
      admins,
      members,
      products,
      banks,
      transactions,
      orders,
      account: account ?? emptyAccount,
    };

    if (hasUsefulData(firestoreState)) {
      return mergeWithRequiredDefaults(firestoreState);
    }

    // Important:
    // If Firebase is configured but Firestore is empty,
    // DO NOT fall back to old localStorage data.
    if (firebaseReady) {
      return emptyState();
    }
  } catch (error) {
    console.error("Unable to load Firestore state:", error);

    // If Firebase exists but fails/empty, do not use stale local browser data.
    if (firebaseReady) {
      return emptyState();
    }
  }

  // Only use localStorage when Firebase is NOT configured.
  try {
    const stored = window.localStorage?.getItem(storageKey);

    if (stored) {
      const localState = JSON.parse(stored) as AppState;

      if (hasUsefulData(localState)) {
        return {
          ...mergeWithRequiredDefaults(localState),
          products: [],
        };
      }
    }
  } catch (error) {
    console.warn("Unable to load local state:", error);
  }

  return emptyState();
}

export function saveLocalState(state: AppState) {
  // Important:
  // When Firebase is active, do not keep saving app data to localStorage,
  // because it can make the app look like it is using old Firebase data.
  if (firebaseReady) return;

  try {
    window.localStorage?.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn("Unable to save local state:", error);
  }
}