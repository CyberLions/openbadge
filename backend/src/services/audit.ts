import { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

interface AuditParams {
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  req: Request;
}

/** Extract the actor identity from the request (OIDC user, API key, or anonymous). */
function getActor(req: Request): { actor: string; actorType: string } {
  const user = (req as any).user;
  if (user) {
    return { actor: user.email || user.sub, actorType: "user" };
  }
  const apiKey = (req as any).apiKey;
  if (apiKey) {
    return { actor: `apikey:${apiKey.name}`, actorType: "apikey" };
  }
  return { actor: "anonymous", actorType: "anonymous" };
}

/** Log an auditable event. Fire-and-forget — never blocks the request. */
export function audit(params: AuditParams) {
  const { actor, actorType } = getActor(params.req);
  prisma.auditEvent
    .create({
      data: {
        action: params.action,
        actor,
        actorType,
        targetType: params.targetType,
        targetId: params.targetId,
        details: (params.details as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.req.ip,
      },
    })
    .catch((err) => console.error("Audit log failed:", err));
}
