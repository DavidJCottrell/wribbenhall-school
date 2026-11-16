import "server-only"

import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { dayReport, recordFile } from "@/db/schema"
import { can } from "@/lib/auth/permissions"
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
// parents only get files on daily reports marked for them, and incident files need incident access.
export async function getFileFor(user: CurrentUser, fileId: string): Promise<StoredFile | null> {
  const [row] = await getDb()
    .select({
      id: recordFile.id,
      pathname: recordFile.pathname,
      filename: recordFile.filename,
      contentType: recordFile.contentType,
      sizeBytes: recordFile.sizeBytes,
      childId: recordFile.childId,
      dayReportId: recordFile.dayReportId,
      incidentId: recordFile.incidentId,
      reportVisibleToParents: dayReport.visibleToParents,
    })
    .from(recordFile)
    .leftJoin(dayReport, eq(dayReport.id, recordFile.dayReportId))
    .where(eq(recordFile.id, fileId))
  if (!row) return null

  // Incident files are for staff with access to incidents. Parents never get them.
  if (row.incidentId && !can(user, "incidents.view")) return null
  if (user.kind === "parent" && (!row.dayReportId || row.reportVisibleToParents !== true)) return null
  if (!(await getPupilFor(user, row.childId))) return null

  return { id: row.id, pathname: row.pathname, filename: row.filename, contentType: row.contentType, sizeBytes: row.sizeBytes }
}
