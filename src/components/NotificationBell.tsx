import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { Bell, CheckCheck, CheckCircle2, Clock, PackageCheck, Trash2, X, XCircle } from "lucide-react";
import type { Navigate } from "../App";
import { auth, db } from "../firebase";
import { adminNotificationEvents, customerNotificationEvents, type NotificationEvent } from "../services/notificationEvents";
import { loadStoredState } from "../services/appStateRepository";
import { enablePushNotifications, isIosWithoutHomeScreenInstall, pushAvailable, syncGrantedPushNotifications } from "../services/pushNotifications";
import { useAppStore } from "../store/AppStore";
import type { Member, Order, StaffAdmin, Transaction } from "../types";

type ReadState = Record<string, { readAt?: boolean; clearedAt?: boolean }>;

export default function NotificationBell({
  scope, member, admin, navigate, onAdminTab,
}: {
  scope: "customer" | "admin";
  member?: Member;
  admin?: StaffAdmin;
  navigate: Navigate;
  onAdminTab?: (tab: NonNullable<NotificationEvent["adminTab"]>) => void;
}) {
  const { state, dispatch } = useAppStore();
  const [uid, setUid] = useState(auth?.currentUser?.uid ?? "");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [readState, setReadState] = useState<ReadState>({});
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const recipientId = scope === "customer" ? member?.id : admin?.id;
  const localKey = `tokopedia-notifications:${scope}:${recipientId}`;

  useEffect(() => auth ? onAuthStateChanged(auth, (user) => setUid(user?.uid ?? "")) : undefined, []);

  useEffect(() => {
    if (!uid || !pushAvailable()) return;
    void syncGrantedPushNotifications().then(setPushEnabled).catch(() => setPushEnabled(false));
  }, [uid]);

  useEffect(() => {
    setOrders(null);
    setTransactions(null);
    setMembers(null);
    if (!db || !recipientId || !uid) return;
    const orderQuery = scope === "customer"
      ? query(collection(db, "orders"), where("memberId", "==", recipientId))
      : collection(db, "orders");
    const transactionQuery = scope === "customer"
      ? query(collection(db, "transactions"), where("memberId", "==", recipientId))
      : collection(db, "transactions");
    const onError = (cause: Error) => setError(`Notifikasi tidak dapat diperbarui: ${cause.message}`);
    const subscriptions = [
      onSnapshot(orderQuery, (snapshot) => setOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Order))), onError),
      onSnapshot(transactionQuery, (snapshot) => setTransactions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Transaction))), onError),
    ];
    if (scope === "admin") subscriptions.push(
      onSnapshot(collection(db, "members"), (snapshot) => setMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Member))), onError),
    );
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [recipientId, scope, uid]);

  useEffect(() => {
    setReadState({});
    if (!recipientId) return;
    if (!db) {
      try { setReadState(JSON.parse(window.localStorage.getItem(localKey) || "{}") as ReadState); } catch { setReadState({}); }
      return;
    }
    if (!uid) return;
    return onSnapshot(collection(db, "notificationStates", uid, "items"), (snapshot) => {
      const next: ReadState = {};
      snapshot.forEach((item) => { next[item.id] = { readAt: Boolean(item.data().readAt), clearedAt: Boolean(item.data().clearedAt) }; });
      setReadState(next);
    }, (cause) => setError(`Status notifikasi tidak dapat dibuka: ${cause.message}`));
  }, [localKey, recipientId, uid]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!panelRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const events = useMemo(() => {
    if (scope === "customer") return member ? customerNotificationEvents(member, orders ?? state.orders, transactions ?? state.transactions) : [];
    return admin ? adminNotificationEvents(admin, members ?? state.members, orders ?? state.orders, transactions ?? state.transactions) : [];
  }, [admin, member, members, orders, scope, state.members, state.orders, state.transactions, transactions]);
  const active = events.filter((item) => !readState[item.id]?.clearedAt);
  const unread = active.filter((item) => !readState[item.id]?.readAt);
  const visible = filter === "unread" ? unread : active;

  const persist = async (items: NotificationEvent[], field: "readAt" | "clearedAt") => {
    if (!items.length) return;
    setBusy(true);
    setError("");
    try {
      if (db) {
        if (!uid) throw new Error("Sesi akun belum siap.");
        for (let index = 0; index < items.length; index += 450) {
          const batch = writeBatch(db);
          for (const item of items.slice(index, index + 450)) {
            batch.set(doc(db, "notificationStates", uid, "items", item.id), { [field]: serverTimestamp() }, { merge: true });
          }
          await batch.commit();
        }
      } else {
        const next = { ...readState };
        for (const item of items) next[item.id] = { ...next[item.id], [field]: true };
        window.localStorage.setItem(localKey, JSON.stringify(next));
        setReadState(next);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status notifikasi tidak dapat disimpan.");
    } finally {
      setBusy(false);
    }
  };

  const openEvent = (event: NotificationEvent) => {
    void persist([event], "readAt");
    setOpen(false);
    if (event.adminTab) onAdminTab?.(event.adminTab);
    navigate(event.path);
    if (db && uid) {
      void loadStoredState().then((latest) => {
        if (auth?.currentUser?.uid === uid) dispatch({ type: "hydrate", payload: latest });
      }).catch((cause) => setError(cause instanceof Error ? cause.message : "Data terbaru tidak dapat dimuat."));
    }
  };

  const enablePush = async () => {
    setPushBusy(true);
    setPushMessage("");
    try {
      const enabled = await enablePushNotifications();
      setPushEnabled(enabled);
      setPushMessage(enabled ? "Notifikasi perangkat aktif." : "Izin notifikasi belum diberikan.");
    } catch (cause) {
      setPushMessage(cause instanceof Error ? cause.message : "Notifikasi perangkat belum tersedia.");
    } finally { setPushBusy(false); }
  };

  return <div className="relative" ref={panelRef}>
    <button type="button" aria-label="Notifikasi" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-emerald-200 hover:bg-mint hover:text-forest">
      <Bell size={18} />
      {unread.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-black text-white">{unread.length > 99 ? "99+" : unread.length}</span>}
    </button>
    {open && <div role="dialog" aria-label="Notifikasi" className="fixed left-3 right-3 top-[68px] z-50 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-panel sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[420px]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-forest px-4 py-3 text-white">
        <div><h2 className="text-sm font-black">Notifikasi</h2><p className="text-xs text-white/80">{unread.length} belum dibaca</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Tutup notifikasi" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"><X size={17} /></button>
      </div>
      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
        <div className="flex flex-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button type="button" onClick={() => setFilter("unread")} className={`flex-1 rounded-lg px-3 py-2 ${filter === "unread" ? "bg-white text-forest shadow-sm" : "text-slate-500"}`}>Belum dibaca</button>
          <button type="button" onClick={() => setFilter("all")} className={`flex-1 rounded-lg px-3 py-2 ${filter === "all" ? "bg-white text-forest shadow-sm" : "text-slate-500"}`}>Semua</button>
        </div>
        <button type="button" onClick={() => void persist(unread, "readAt")} disabled={busy || unread.length === 0} title="Tandai semua dibaca" aria-label="Tandai semua dibaca" className="grid h-9 w-9 place-items-center rounded-lg text-forest hover:bg-mint disabled:opacity-40"><CheckCheck size={17} /></button>
        <button type="button" onClick={() => void persist(active, "clearedAt")} disabled={busy || active.length === 0} title="Hapus semua" aria-label="Hapus semua notifikasi" className="grid h-9 w-9 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={16} /></button>
      </div>
      <div className="border-b border-slate-100 bg-emerald-50/50 px-4 py-3 text-xs">
        {pushEnabled ? <p className="font-bold text-emerald-700">Notifikasi perangkat aktif di perangkat ini.</p>
          : pushAvailable() ? <button type="button" disabled={pushBusy} onClick={() => void enablePush()} className="w-full rounded-lg bg-white px-3 py-2 text-left font-bold text-forest shadow-sm ring-1 ring-emerald-100 disabled:opacity-60">{pushBusy ? "Mengaktifkan..." : isIosWithoutHomeScreenInstall() ? "Cara mengaktifkan di iPhone" : "Aktifkan notifikasi perangkat"}</button>
            : <p className="text-slate-500">Notifikasi perangkat belum tersedia di situs ini.</p>}
        {pushMessage && <p role="status" className="mt-2 leading-5 text-slate-600">{pushMessage}</p>}
      </div>
      {error && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
      <div className="max-h-[min(62vh,520px)] divide-y divide-slate-100 overflow-y-auto">
        {visible.length ? visible.map((item) => <div key={item.id} className={`group relative flex gap-3 p-4 pr-12 ${readState[item.id]?.readAt ? "bg-white" : "bg-emerald-50/40"}`}>
          <button type="button" onClick={() => openEvent(item)} className="flex min-w-0 flex-1 gap-3 text-left">
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${toneClass(item.tone)}`}>{toneIcon(item.tone)}</span>
            <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.body}</span><span className="mt-1 block text-[11px] text-slate-400">{item.time}</span></span>
          </button>
          <button type="button" onClick={() => void persist([item], "clearedAt")} disabled={busy} title="Hapus notifikasi" aria-label={`Hapus ${item.title}`} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>
        </div>) : <div className="grid place-items-center px-5 py-10 text-center"><Bell size={22} className="text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">{filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi"}</p></div>}
      </div>
    </div>}
  </div>;
}

function toneClass(tone: NotificationEvent["tone"]) {
  if (tone === "success") return "bg-emerald-100 text-emerald-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "danger") return "bg-rose-100 text-rose-700";
  return "bg-mint text-forest";
}

function toneIcon(tone: NotificationEvent["tone"]) {
  if (tone === "success") return <CheckCircle2 size={16} />;
  if (tone === "warning") return <Clock size={16} />;
  if (tone === "danger") return <XCircle size={16} />;
  return <PackageCheck size={16} />;
}
