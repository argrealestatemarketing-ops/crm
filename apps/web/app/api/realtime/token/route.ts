import { NextResponse } from "next/server";
import { auth } from "@crm/auth";
import { headers } from "next/headers";
import * as jose from "jose";

const CENTRIFUGO_SECRET = new TextEncoder().encode(
  process.env.CENTRIFUGO_SECRET!
);

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // JWT for Centrifugo — sub = userId
  const token = await new jose.SignJWT({
    sub: session.user.id,
    // معلومات إضافية يقدر Centrifugo يستخدمها
    info: {
      name: session.user.name,
      workspaceId: session.user.workspaceId,
    },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")   // token يتجدد كل ساعة
    .setIssuedAt()
    .sign(CENTRIFUGO_SECRET);

  return NextResponse.json({ token });
}
