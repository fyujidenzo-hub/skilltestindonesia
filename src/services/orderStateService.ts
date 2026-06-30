import type { Order, OrderStatus } from "../types";

export type OrderState = 
  | "no_task"
  | "waiting_assignment"
  | "product_assigned"
  | "waiting_shipment"
  | "belum_diserahkan"
  | "diserahkan";

/**
 * Map order status to current workflow state
 * Handles both new and legacy statuses
 */
export function getOrderState(order: Order | null): OrderState {
  if (!order) return "no_task";
  
  const status = order.status as OrderStatus;
  
  // New workflow states
  if (status === "no_task") return "no_task";
  if (status === "waiting_assignment") return "waiting_assignment";
  if (status === "product_assigned") return "product_assigned";
  if (status === "waiting_shipment") return "waiting_shipment";
  if (status === "belum_diserahkan") return "belum_diserahkan";
  if (status === "diserahkan") return "diserahkan";
  
  // Legacy states mapping
  if (status === "waiting") return "waiting_assignment";
  if (status === "assigned") return "product_assigned";
  if (status === "completed") return "diserahkan";
  if (status === "frozen") return "belum_diserahkan";
  
  return "no_task";
}

/**
 * Get display text for order state
 */
export function getOrderStateLabel(state: OrderState): string {
  const labels: Record<OrderState, string> = {
    no_task: "No Task",
    waiting_assignment: "Waiting for Assignment",
    product_assigned: "Product Assigned",
    waiting_shipment: "Waiting for Shipment",
    belum_diserahkan: "Not delivered",
    diserahkan: "Delivered",
  };
  return labels[state];
}

/**
 * Check if order allows accepting a new task
 */
export function canAcceptTask(order: Order | null): boolean {
  if (!order) return true;
  const state = getOrderState(order);
  return state === "no_task" || state === "diserahkan";
}

/**
 * Check if order is waiting for admin assignment
 */
export function isWaitingAssignment(order: Order | null): boolean {
  if (!order) return false;
  return getOrderState(order) === "waiting_assignment";
}

/**
 * Check if order has products assigned
 */
export function hasProductsAssigned(order: Order | null): boolean {
  if (!order) return false;
  const state = getOrderState(order);
  return state === "product_assigned" || 
         state === "waiting_shipment" || 
         state === "belum_diserahkan" || 
         state === "diserahkan";
}

/**
 * Check if order can be submitted
 */
export function canSubmitOrder(order: Order | null): boolean {
  if (!order) return false;
  const state = getOrderState(order);
  return state === "product_assigned";
}

/**
 * Check if order is in shipment phase
 */
export function isInShipmentPhase(order: Order | null): boolean {
  if (!order) return false;
  const state = getOrderState(order);
  return state === "waiting_shipment" || state === "belum_diserahkan";
}

/**
 * Get next status for order submission
 */
export function getNextStatusAfterSubmit(current: OrderStatus): OrderStatus {
  const state = getOrderState({ status: current } as Order);
  if (state === "product_assigned") return "waiting_shipment";
  if (state === "waiting_shipment") return "belum_diserahkan";
  if (state === "belum_diserahkan") return "diserahkan";
  return current;
}
