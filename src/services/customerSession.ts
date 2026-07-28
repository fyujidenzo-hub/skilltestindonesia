import { clearCookieSession, getCookieSession, setCookieSession } from "./browserSession";
import { clearAuthenticatedSession } from "./authService";

const activeCustomerKey = "orderops-member-session";

type CustomerLike = {
  id: string;
};

export function getActiveCustomerId() {
  return getCookieSession(activeCustomerKey);
}

export function setActiveCustomerId(memberId: string) {
  setCookieSession(activeCustomerKey, memberId);
}

export function clearActiveCustomerId() {
  clearCookieSession(activeCustomerKey);
  void clearAuthenticatedSession();
}

export function getActiveCustomer<T extends CustomerLike>(customers: T[]) {
  const activeId = getActiveCustomerId();
  return customers.find((customer) => customer.id === activeId) ?? null;
}
