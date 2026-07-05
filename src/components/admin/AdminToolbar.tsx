import { Search } from "lucide-react";
import { Select } from "../common";
import type { StaffAdmin } from "../../types";

interface AdminToolbarProps {
  admins: StaffAdmin[];
  registrationCode: string;
  adminCode: string;
  selectedAdmin: string;
  query: string;
  siteUrl?: string;
  onSelectedAdminChange: (admin: string) => void;
  onQueryChange: (query: string) => void;
}

export default function AdminToolbar({ admins, registrationCode, adminCode, selectedAdmin, query, siteUrl, onSelectedAdminChange, onQueryChange }: AdminToolbarProps) {
  const publicSiteUrl = getPublicSiteUrl(siteUrl);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded bg-white p-4 shadow-panel md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm text-slate-500">Admin code: <span className="font-bold text-slate-700">{adminCode || "-"}</span></p>
        <p className="text-sm text-slate-500">Invitation registration link</p>
        {registrationCode ? (
          <p className="break-all text-lg font-bold text-forest">{publicSiteUrl}/register?code={registrationCode}</p>
        ) : (
          <p className="text-sm font-semibold text-coral">No Firebase admin invitation code available.</p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selectedAdmin} onChange={onSelectedAdminChange} options={["All admins", ...admins.map((admin) => admin.name)]} />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-forest sm:w-64"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search member, phone, code"
          />
        </div>
      </div>
    </div>
  );
}

function getPublicSiteUrl(value?: string) {
  const normalized = normalizeUrl(value);
  if (!normalized || normalized.includes("tokopediakaririndonesia.onrender.com")) {
    return "https://skilltestindonesia.com";
  }
  return normalized;
}

function normalizeUrl(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/\/+$/, "") : `https://${trimmed.replace(/\/+$/, "")}`;
}
