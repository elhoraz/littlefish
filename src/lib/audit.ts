import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "PAYMENT_RECORD"
  | "FILE_UPLOAD";

export interface LogAuditParams {
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  details?: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || undefined,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || undefined,
        details: params.details,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Silent fail so primary business mutations are not disrupted
  }
}
