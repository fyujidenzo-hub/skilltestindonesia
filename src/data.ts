import type { AppState } from "./types";
import { DEFAULT_SITE_URL } from "./services/siteUrl";

export const initialState: AppState = {
  admins: [],
  members: [],
  products: [
    { id: "p1", code: "OPR-5256", name: "OPPO Reno15 5G 8/256GB", price: 7699000, commission: 1539800, requiredBalance: 500000, quantity: 42, category: "Electronics", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80" },
    { id: "p2", code: "NTR-220", name: "Nutrition Bundle 220g", price: 284000, commission: 42600, requiredBalance: 0, quantity: 118, category: "Health", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80" },
    { id: "p3", code: "HME-774", name: "Smart Home Starter Kit", price: 1299000, commission: 194850, requiredBalance: 100000, quantity: 63, category: "Home", image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80" },
    { id: "p4", code: "FAS-118", name: "Daily Essentials Pack", price: 179000, commission: 26850, requiredBalance: 0, quantity: 230, category: "Lifestyle", image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80" },
  ],
  banks: [],
  transactions: [],
  orders: [],
  account: {
    siteUrl: DEFAULT_SITE_URL,
    customerServiceTelegramUrl: "",
  },
};
