import { initialState } from "../data";
import * as adminsService from "../services/adminsService";
import * as membersService from "../services/membersService";
import * as productsService from "../services/productsService";
import * as banksService from "../services/banksService";
import * as transactionsService from "../services/transactionsService";
import * as ordersService from "../services/ordersService";
import * as settingsService from "../services/settingsService";
import { firebaseReady } from "../firebase";

/**
 * Seed Firestore with initial data from data.ts
 * Call this once on app initialization if collections are empty
 * Usage: await seedFirestore();
 */
export async function seedFirestore(): Promise<boolean> {
  if (!firebaseReady) {
    console.warn("Firebase not initialized, skipping seeding");
    return false;
  }

  try {
    console.log("Starting Firestore seed...");

    // Seed admins
    for (const admin of initialState.admins) {
      await adminsService.createAdmin(admin);
    }
    console.log(`✓ Seeded ${initialState.admins.length} admins`);

    // Seed members
    for (const member of initialState.members) {
      await membersService.createMember(member);
    }
    console.log(`✓ Seeded ${initialState.members.length} members`);

    // Seed products
    for (const product of initialState.products) {
      await productsService.createProduct(product);
    }
    console.log(`✓ Seeded ${initialState.products.length} products`);

    // Seed banks
    for (const bank of initialState.banks) {
      await banksService.createBank(bank);
    }
    console.log(`✓ Seeded ${initialState.banks.length} banks`);

    // Seed transactions
    for (const transaction of initialState.transactions) {
      await transactionsService.createTransaction(transaction);
    }
    console.log(`✓ Seeded ${initialState.transactions.length} transactions`);

    // Seed orders
    for (const order of initialState.orders) {
      await ordersService.createOrder(order);
    }
    console.log(`✓ Seeded ${initialState.orders.length} orders`);

    // Seed settings
    await settingsService.updateSettings(initialState.account);
    console.log("✓ Seeded account settings");

    console.log("Firestore seeding complete!");
    return true;
  } catch (error) {
    console.error("Error seeding Firestore:", error);
    return false;
  }
}
