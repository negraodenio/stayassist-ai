import { GuestRequestApp } from "@/components/guest/guest-request-app";

export default async function GuestTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <GuestRequestApp token={token} />;
}
