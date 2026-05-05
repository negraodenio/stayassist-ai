import {
  requestTypeLabels,
  type GuestRequest,
} from "@/lib/guest-requests";

type WhatsAppAlertResult =
  | {
      enabled: true;
      sent: true;
      sid: string;
      status?: string;
    }
  | {
      enabled: true;
      sent: false;
      error: string;
      errorCode?: number | null;
      status?: string;
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

function getTemplateContentSid() {
  return (
    process.env.TWILIO_WHATSAPP_CONTENT_SID ||
    process.env.TWILIO_CONTENT_SID ||
    process.env.TWILIO_TEMPLATE_SID
  );
}

function buildAlertMessage(request: GuestRequest & { guestMessage?: string }) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests`;

  const lines = [
    "🤖 StayAssist AI — Guest Message",
    "",
    `🏨 ${request.property}`,
    `🛎️ ${request.room}`,
  ];

  if (request.guestMessage) {
    lines.push("");
    lines.push(`💬 Guest said: "${request.guestMessage}"`);
  } else {
    lines.push(`Requested: ${requestTypeLabels[request.type].toLowerCase()}`);
  }

  lines.push("");
  lines.push("📊 Dashboard:");
  lines.push(dashboardUrl);

  return lines.join("\n");
}

function buildAlertSummary(request: GuestRequest & { guestMessage?: string }) {
  if (request.guestMessage) {
    return request.guestMessage;
  }

  return requestTypeLabels[request.type];
}

function buildTwilioBody(
  request: GuestRequest & { guestMessage?: string },
  from: string,
  to: string,
) {
  const contentSid = getTemplateContentSid();
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/requests`;

  if (contentSid) {
    return new URLSearchParams({
      From: normalizeWhatsAppNumber(from),
      To: normalizeWhatsAppNumber(to),
      ContentSid: contentSid,
      ContentVariables: JSON.stringify({
        "1": request.property,
        "2": request.room,
        "3": buildAlertSummary(request),
        "4": dashboardUrl,
      }),
    });
  }

  return new URLSearchParams({
    From: normalizeWhatsAppNumber(from),
    To: normalizeWhatsAppNumber(to),
    Body: buildAlertMessage(request),
  });
}

export async function sendRequestWhatsAppAlert(
  request: GuestRequest & { guestMessage?: string },
  options: { to?: string | null } = {},
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
  const to = options.to || process.env.DEFAULT_PHONE;

  if (!accountSid || !authToken || !from || !to) {
    return {
      enabled: true,
      sent: false,
      error: "Twilio WhatsApp environment variables are incomplete.",
    };
  }

  const body = buildTwilioBody(request, from, to);

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
    error_code?: number | null;
    error_message?: string | null;
    message?: string;
    sid?: string;
    status?: string;
  };

  if (!response.ok || payload.error_code) {
    return {
      enabled: true,
      sent: false,
      error:
        payload.error_message ||
        payload.message ||
        "Twilio WhatsApp request failed.",
      errorCode: payload.error_code,
      status: payload.status,
    };
  }

  return {
    enabled: true,
    sent: true,
    sid: payload.sid || "",
    status: payload.status,
  };
}
