import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get("value");

  if (!value) {
    return NextResponse.json({ message: "QR value is required." }, { status: 400 });
  }

  const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  qrUrl.searchParams.set("size", "900x900");
  qrUrl.searchParams.set("margin", "28");
  qrUrl.searchParams.set("format", "png");
  qrUrl.searchParams.set("data", value);

  const response = await fetch(qrUrl, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Unable to generate QR PNG." },
      { status: 502 },
    );
  }

  const image = await response.arrayBuffer();

  return new NextResponse(image, {
    headers: {
      "Content-Disposition": 'attachment; filename="stayassist-qr.png"',
      "Content-Type": "image/png",
    },
  });
}
