import "server-only"

import { hashPassword } from "better-auth/crypto"
import { and, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { account, session, user } from "@/db/schema"

// Account operations done straight against the database. They don't depend on the Better Auth admin
// plugin, whose permission checks are tied to its own "admin" role. Callers check our permissions first.

export async function revokeAllSessions(userId: string) {
  await getDb().delete(session).where(eq(session.userId, userId))
}

export async function setPassword(userId: string, password: string) {
  const db = getDb()
  const hashed = await hashPassword(password)

  const updated = await db
    .update(account)
    .set({ password: hashed, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .returning({ id: account.id })

  if (updated.length === 0) {
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: userId, providerId: "credential", userId, password: hashed })
  }
}

export async function setBanned(userId: string, banned: boolean) {
  await getDb()
    .update(user)
    .set({ banned, banReason: null, banExpires: null, updatedAt: new Date() })
    .where(eq(user.id, userId))
  if (banned) await revokeAllSessions(userId)
}

// Sessions and the login itself go with it (cascade). Anything they wrote stays, with the author cleared.
export async function deleteLogin(userId: string) {
  await getDb().delete(user).where(eq(user.id, userId))
}
