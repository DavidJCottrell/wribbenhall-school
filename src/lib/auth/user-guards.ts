import "server-only"

import { and, count, eq, ne, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { user } from "@/db/schema"

// There must always be someone who can manage logins, or nobody could fix a mistake.
export async function hasOtherLoginManager(excludingUserId: string) {
  const [row] = await getDb()
    .select({ total: count() })
    .from(user)
    .where(
      and(
        eq(user.role, "staff"),
        eq(user.banned, false),
        ne(user.id, excludingUserId),
        sql`'users.manage' = ANY(${user.permissions})`,
      ),
    )
  return (row?.total ?? 0) > 0
}

export const LAST_LOGIN_MANAGER_MESSAGE = "There must always be at least one active login that can manage logins and permissions."
