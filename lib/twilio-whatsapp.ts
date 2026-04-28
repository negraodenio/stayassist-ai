import {
  requestTypeLabels,
  type GuestRequest,
  type GuestRequestType,
} from "@/lib/guest-requests";

type WhatsAppAlertResult =
  | {
      enabled: true;
      sent: true;
      sid: string;
    }
  | {
      enabled: true;
      sent: false;
      error: string;
    }
  | {
      enabled: false;
      sent: false;
      reason: string;
    };

function isWhatsAppAlertsEnabled() {
  return process.env.SEND_WHATSAPP_ALERTS !== "false";
}

function normalizeWhatsAppNumber(value: string) {
  return value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;
}

function getRequestPriority(type: GuestRequestType) {
  if (type === "issue") {
    return "High priority";
  }

  return "Normal";
}

function buildAlertMessage(request: GuestRequest) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests`;

  return [
    "StayAssist Alert",
    "",
    `${request.property}`,
    `${request.room} requested ${requestTypeLabels[request.type].toLowerCase()}.`,
    `Priority: ${getRequestPriority(request.type)}`,
    "",
    "Open dashboard to manage:",
    dashboardUrl,
  ].join("\n");
}

export async function sendRequestWhatsAppAlert(
  request: GuestRequest,
): Promise<WhatsAppAlertResult> {
  if (!isWhatsAppAlertsEnabled()) {
    return {
      enabled: false,
      sent: false,
      reason: "WhatsApp alerts are disabled.",
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.DEFAULT_PHONE;

  if (!accountSid || !authToken || !from || !to) {
    return {
      enabled: true,
      sent: false,
      error: "Twilio WhatsApp environment variables are incomplete.",
    };
  }

  const body = new URLSearchParams({
    From: normalizeWhatsAppNumber(from),
    To: normalizeWhatsAppNumber(to),
    Body: buildAlertMessage(request),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString(
          "base64",
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };

  if (!response.ok) {
    return {
      enabled: true,
      sent: false,
      error: payload.message || "Twilio WhatsApp request failed.",
    };
  }

  return {
    enabled: true,
    sent: true,
    sid: payload.sid || "",
  };
}
