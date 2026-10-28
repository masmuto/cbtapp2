import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ok } from "@/lib/api";

// Mengembalikan info sesi: user, role, school aktif, daftar keanggotaan.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return ok({ user: null }, 200);
  return ok({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      isSuperadmin: session.user.isSuperadmin,
      memberships: session.user.memberships,
      activeSchoolId: session.user.activeSchoolId,
      activeRole: session.user.activeRole,
    },
  });
}
