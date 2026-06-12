import "server-only"
import { db } from "@crm/db"
import { userPermissions, auditLogs } from "@crm/db"
import { and, eq } from "drizzle-orm"
import { PERMISSION_KEYS, type PermissionKey } from "@crm/shared-lib"

export { PERMISSION_KEYS, PERMISSION_LABELS, AUDIT_ACTION_LABELS, type PermissionKey } from "@crm/shared-lib"

/**
 * Returns the set of granted permission keys for a user.
 * Admins implicitly have every permission.
 */
export async function getUserPermissions(userId: string, role: string): Promise<Set<PermissionKey>> {
  if (role === "admin") return new Set(PERMISSION_KEYS)
  const rows = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId))
  const granted = new Set<PermissionKey>()
  for (const r of rows) {
    if (r.granted && (PERMISSION_KEYS as readonly string[]).includes(r.permissionKey)) {
      granted.add(r.permissionKey as PermissionKey)
    }
  }
  return granted
}

export async function hasPermission(userId: string, role: string, key: PermissionKey): Promise<boolean> {
  if (role === "admin") return true
  const rows = await db
    .select()
    .from(userPermissions)
    .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permissionKey, key)))
    .limit(1)
  return rows[0]?.granted ?? false
}

/** Append an entry to the audit log. Never throws to the caller. */
export async function logAudit(input: {
  userId?: string | null
  userName?: string | null
  action: string
  entity?: string
  entityId?: string
  details?: string
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      userName: input.userName ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details,
    })
  } catch {
    // swallow — auditing must never break the main flow
  }
}
