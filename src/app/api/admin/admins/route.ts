import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { adminActionSchema } from "@/lib/validation/schemas";
import { FieldValue } from "firebase-admin/firestore";

function genericError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  // 1. Extract bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return genericError("Unauthorized", 401);
  }

  // 2. Verify caller is an admin
  let callerUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    if (!decoded.admin) {
      return genericError("Forbidden", 403);
    }
    callerUid = decoded.uid;
  } catch {
    return genericError("Unauthorized", 401);
  }

  // 3. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return genericError("Invalid request body");
  }

  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) {
    return genericError("Invalid request: " + parsed.error.errors[0]?.message);
  }

  const { email, action } = parsed.data;

  // 4. Look up target user
  let targetUser: Awaited<ReturnType<typeof adminAuth.getUserByEmail>>;
  try {
    targetUser = await adminAuth.getUserByEmail(email);
  } catch {
    return genericError("No user found with that email address.");
  }

  const targetUid = targetUser.uid;

  if (action === "grant") {
    // Target must have a verified email
    if (!targetUser.emailVerified) {
      return genericError(
        "The target account's email is not verified. Ask them to verify first."
      );
    }

    const existing = targetUser.customClaims ?? {};
    await adminAuth.setCustomUserClaims(targetUid, {
      ...existing,
      admin: true,
    });

    await adminDb
      .collection("adminDirectory")
      .doc(targetUid)
      .set({
        email: targetUser.email ?? email,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: callerUid,
      });

    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    // Block self-revoke
    if (targetUid === callerUid) {
      return genericError("You cannot revoke your own admin access.");
    }

    // Block removing the last admin
    const dirSnap = await adminDb.collection("adminDirectory").count().get();
    const adminCount = dirSnap.data().count;
    if (adminCount <= 1) {
      return genericError(
        "Cannot remove the last admin. Grant access to another account first."
      );
    }

    const existing = targetUser.customClaims ?? {};
    const { admin: _removed, ...rest } = existing as Record<string, unknown>;
    await adminAuth.setCustomUserClaims(targetUid, rest);
    await adminAuth.revokeRefreshTokens(targetUid);

    await adminDb.collection("adminDirectory").doc(targetUid).delete();

    return NextResponse.json({ ok: true });
  }

  return genericError("Unknown action");
}
