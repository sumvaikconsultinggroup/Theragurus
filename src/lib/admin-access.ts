export const adminModules = [
  { key: "overview", label: "Overview" },
  { key: "live", label: "Live" },
  { key: "analytics", label: "Analytics" },
  { key: "bookings", label: "Bookings" },
  { key: "desk", label: "Book offline" },
  { key: "calendar", label: "Calendar" },
  { key: "customers", label: "Customers" },
  { key: "remarket", label: "Remarket" },
  { key: "marketing", label: "Newsletter" },
  { key: "services", label: "Services" },
  { key: "coupons", label: "Coupons" },
  { key: "activity", label: "Activity log" },
  { key: "settings", label: "Settings" },
] as const;

export type ModuleKey = (typeof adminModules)[number]["key"];
export type AccessLevel = "hidden" | "view" | "edit";
export type AccessMap = Record<ModuleKey, AccessLevel>;

export type StaffProfile = {
  id: string;
  name: string;
  email: string;
  owner: boolean;
  role: string;
  access: AccessMap;
};

export function fullAccess(): AccessMap {
  return Object.fromEntries(
    adminModules.map((module) => [module.key, "edit"]),
  ) as AccessMap;
}

export function hiddenAccess(): AccessMap {
  return Object.fromEntries(
    adminModules.map((module) => [module.key, "hidden"]),
  ) as AccessMap;
}

export function staffTemplate(): AccessMap {
  return {
    ...hiddenAccess(),
    overview: "view",
    live: "view",
    bookings: "view",
    calendar: "view",
    customers: "view",
  };
}

export function parseAccess(value: unknown): AccessMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const access = hiddenAccess();
  for (const entry of adminModules) {
    const level = source[entry.key];
    if (level === "view" || level === "edit" || level === "hidden")
      access[entry.key] = level;
  }
  return access;
}

export function accountAccess(account: {
  owner?: boolean;
  role?: string;
  access?: unknown;
}): Pick<StaffProfile, "owner" | "role" | "access"> {
  if (account.owner === true || (account.owner !== false && account.access == null))
    return { owner: true, role: "Owner", access: fullAccess() };
  const role = (account.role || "Staff").trim().slice(0, 40) || "Staff";
  return {
    owner: false,
    role,
    access: parseAccess(account.access) ?? hiddenAccess(),
  };
}

export function allows(
  access: AccessMap,
  key: ModuleKey,
  level: "view" | "edit",
) {
  const have = access[key];
  return level === "edit" ? have === "edit" : have === "view" || have === "edit";
}

export function grantFits(
  actor: AccessMap,
  next: AccessMap,
  owner: boolean,
) {
  if (owner) return true;
  return adminModules.every((module) => {
    const give = next[module.key];
    const have = actor[module.key];
    if (give === "hidden") return true;
    if (give === "view") return have === "view" || have === "edit";
    return have === "edit";
  });
}

export function hasAnyAccess(access: AccessMap) {
  return adminModules.some((module) => access[module.key] !== "hidden");
}
