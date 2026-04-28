export type GuestRequestType = "towels" | "cleaning" | "issue" | "help";

export type GuestRequestStatus = "Open" | "In progress" | "Resolved";

export type GuestUnit = {
  id: string;
  name: string;
  propertyId: string;
  propertyName: string;
  organizationId: string;
  qrToken?: string;
  qrCreatedAt?: string | null;
  qrRegeneratedCount?: number;
};

export type GuestOrganization = {
  id: string;
  name: string;
};

export type GuestRequest = {
  id: string;
  propertyId: string;
  property: string;
  unitId: string;
  room: string;
  type: GuestRequestType;
  status: GuestRequestStatus;
  createdAt: string;
};

export const requestTypeLabels: Record<GuestRequestType, string> = {
  towels: "Fresh towels",
  cleaning: "Room cleaning",
  issue: "Report an issue",
  help: "Concierge help",
};

export const requestTypeDescriptions: Record<GuestRequestType, string> = {
  towels: "Ask housekeeping to bring premium fresh towels to your room.",
  cleaning: "Request a refresh, turndown, or full room service visit.",
  issue: "Let the team know about maintenance, comfort, or access issues.",
  help: "Reach concierge for bookings, transfers, amenities, or local support.",
};

export const requestTypeIntents: Record<GuestRequestType, string> = {
  towels: "Housekeeping",
  cleaning: "Service",
  issue: "Ops alert",
  help: "Concierge",
};

export const fallbackUnits: GuestUnit[] = [
  {
    id: "unit-suite-804",
    name: "Suite 804",
    propertyId: "property-monarch-bay",
    propertyName: "Monarch Bay Hotel",
    organizationId: "org-stayassist",
  },
  {
    id: "unit-loft-12",
    name: "Loft 12",
    propertyId: "property-atelier-house",
    propertyName: "Atelier House",
    organizationId: "org-stayassist",
  },
  {
    id: "unit-villa-7",
    name: "Villa 7",
    propertyId: "property-harbor-residences",
    propertyName: "The Harbor Residences",
    organizationId: "org-stayassist",
  },
  {
    id: "unit-penthouse-3a",
    name: "Penthouse 3A",
    propertyId: "property-monarch-bay",
    propertyName: "Monarch Bay Hotel",
    organizationId: "org-stayassist",
  },
];

export const fallbackOrganizations: GuestOrganization[] = [
  {
    id: "org-stayassist",
    name: "StayAssist Demo Group",
  },
];

export const fallbackGuestRequests: GuestRequest[] = [
  {
    id: "req-1001",
    propertyId: "property-monarch-bay",
    property: "Monarch Bay Hotel",
    unitId: "unit-suite-804",
    room: "Suite 804",
    type: "towels",
    status: "Open",
    createdAt: "2026-04-28T08:35:00.000Z",
  },
  {
    id: "req-1002",
    propertyId: "property-atelier-house",
    property: "Atelier House",
    unitId: "unit-loft-12",
    room: "Loft 12",
    type: "cleaning",
    status: "In progress",
    createdAt: "2026-04-28T09:10:00.000Z",
  },
  {
    id: "req-1003",
    propertyId: "property-harbor-residences",
    property: "The Harbor Residences",
    unitId: "unit-villa-7",
    room: "Villa 7",
    type: "help",
    status: "Resolved",
    createdAt: "2026-04-28T09:45:00.000Z",
  },
];

export function formatRequestTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
