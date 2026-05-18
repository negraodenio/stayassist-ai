/**
 * Knowledge Base constants and types.
 * Shared between server actions and client components.
 * NOT a "use server" file — safe to export constants and types.
 */

export const DOC_TYPES = [
  "manual",
  "sop",
  "faq",
  "tourism",
  "emergency",
  "concierge",
  "policy",
  "appliance",
  "multilingual",
  "other",
] as const;

export type DocType = (typeof DOC_TYPES)[number];
