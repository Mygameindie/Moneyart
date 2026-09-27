import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "insecure-dev-secret";
const COOKIE_NAME = "moneyart_token";

export type TokenPayload = {
  userId: string;
  username: string;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;

/** Read + verify the auth cookie from a Next.js Server Component / Route Handler context. */
export function getAuthFromCookies(): TokenPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Read + verify the auth cookie from a raw NextRequest (used inside route handlers). */
export function getAuthFromRequest(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser() {
  const payload = getAuthFromCookies();
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;
  return user;
}

/** Verify a raw token string (used by the socket.io server, which has no cookies() access). */
export function verifyTokenString(token: string) {
  return verifyToken(token);
}

/** Extract + verify the auth token from a raw `Cookie` header string (socket.io handshake). */
export function getAuthFromCookieHeader(cookieHeader: string | undefined): TokenPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return verifyToken(token);
}
