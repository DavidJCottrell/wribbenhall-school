import "server-only"

import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { dayReport, recordFile } from "@/db/schema"
import type { CurrentUser } from "@/lib/auth/session"

import { getPupilFor } from "./pupils"

export type FileView = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
}

export type StoredFile = FileView & { pathname: string }

// A file is as visible as the record it belongs to: the pupil must be visible to the user,
// and parents only get files on records marked for them.
export async function getFileFor(user: CurrentUser, fileId: string): Promise<StoredFile | null> {
  const [row] = await getDb()
    .select({
      id: recordFile.id,
      pathname: recordFile.pathname,
      filename: recordFile.filename,
      contentType: recordFile.contentType,
      sizeBytes: recordFile.sizeBytes,
      childId: recordFile.childId,
      reportVisibleToParents: dayReport.visibleToParents,
    })
    .from(recordFile)
    .leftJoin(dayReport, eq(dayReport.id, recordFile.dayReportId))
    .where(eq(recordFile.id, fileId))
  if (!row) return null

  if (user.kind === "parent" && row.reportVisibleToParents !== true) return null
  if (!(await getPupilFor(user, row.childId))) return null

  return { id: row.id, pathname: row.pathname, filename: row.filename, contentType: row.contentType, sizeBytes: row.sizeBytes }
}
