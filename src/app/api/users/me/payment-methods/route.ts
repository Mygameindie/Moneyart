import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["PAYPAL", "QR", "BANK"]),
  label: z.string().trim().min(1, "Label is required").max(50),
  value: z.string().trim().min(1, "Value is required").max(200),
  qrImageUrl: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const methods = await prisma.paymentMethod.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ paymentMethods: methods });
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const method = await prisma.paymentMethod.create({
    data: { ...parsed.data, userId: auth.userId },
  });
  return NextResponse.json({ paymentMethod: method }, { status: 201 });
}
