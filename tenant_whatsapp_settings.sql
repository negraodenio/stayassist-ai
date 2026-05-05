-- Per-tenant WhatsApp alert settings.
-- Run this in Supabase SQL Editor.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS whatsapp_alert_phone text;

COMMENT ON COLUMN public.organizations.whatsapp_alert_phone
IS 'Tenant WhatsApp recipient for guest request alerts, stored in E.164 format such as +351912345678.';
