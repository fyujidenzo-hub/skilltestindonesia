import { initialState } from "../data";
import type { AppState } from "../types";
import * as adminsService from "./adminsService";
import * as membersService from "./membersService";
import * as productsService from "./productsService";
import * as banksService from "./banksService";
import * as transactionsService from "./transactionsService";
import * as ordersService from "./ordersService";
import * as settingsService from "./settingsService";

const storageKey = "orderops-app-state";

export async function loadStoredState(): Promise<AppState> {
  try {
    // Try to load from Firestore collections
    const [admins, members, products, banks, transactions, orders, settings] = await Promise.all([
      adminsService.getAdmins(),
      membersService.getMembers(),
      productsService.getProducts(),
      banksService.getBanks(),
      transactionsService.getTransactions(),
      ordersService.getOrders(),
      settingsService.getSettings(),
    ]);

    // If we got data from Firebase, use it
    if (admins.length > 0 || members.length > 0 || products.length > 0) {
      return {
        admins,
        members,
        products,
        banks,
        transactions,
        orders,
        account: settings || initialState.account,
      };
    }
  } catch (error) {
    console.error("Error loading from Firestore:", error);
  }

  // Fallback to localStorage
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    return JSON.parse(stored) as AppState;
  }

  // Fallback to initial state
  return initialState;
}

export async function saveStoredState(state: AppState) {
  // Always save to localStorage for offline support
  window.localStorage.setItem(storageKey, JSON.stringify(state));

  // Try to sync individual collections to Firestore
  try {
    // Note: For now, we're not syncing individual collection updates
    // The reducer handles collection-specific operations
    // This function is kept for backward compatibility
  } catch (error) {
    console.error("Error saving to Firestore:", error);
  }
}
