import type { Order } from "../types";

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

export function generateOrderCode(date = new Date()): string {
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
  const random4 = pad(Math.floor(Math.random() * 10000), 4);
  return `PSN-${timestamp}-${random4}`;
}

export function getOrderCode(order: Pick<Order, "id" | "referenceNumber">): string {
  return order.referenceNumber || order.id;
}
