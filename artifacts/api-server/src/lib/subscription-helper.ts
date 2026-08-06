/**
 * Subscription activation helper.
 *
 * Logika:
 * - Jika user sudah punya langganan aktif → perpanjang dari tanggal kadaluwarsa
 *   yang ada (bukan dari sekarang), sehingga hari tersisa tidak hilang.
 * - Jika belum ada langganan aktif → buat baru mulai dari sekarang.
 *
 * Dipakai di: callback Duitku, callback Midtrans, konfirmasi manual admin.
 */

import { db } from "@workspace/db";
import { userSubscriptionsTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";

export async function activateOrExtendSubscription(opts: {
  userId:    string;
  planId:    string;
  planName:  string;
  durationDays: number;
}) {
  const { userId, planId, planName, durationDays } = opts;
  const now = new Date();

  // Cari langganan aktif yang belum kadaluwarsa (urutan terbaru)
  const [existing] = await db
    .select()
    .from(userSubscriptionsTable)
    .where(
      and(
        eq(userSubscriptionsTable.userId, userId),
        eq(userSubscriptionsTable.status, "active"),
        gt(userSubscriptionsTable.expiresAt, now),
      )
    )
    .orderBy(desc(userSubscriptionsTable.expiresAt))
    .limit(1);

  if (existing) {
    // Perpanjang dari tanggal kadaluwarsa yang ada
    const base    = new Date(existing.expiresAt);
    const expires = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db
      .update(userSubscriptionsTable)
      .set({
        planId,
        planName,
        expiresAt: expires,
        updatedAt: now,
      })
      .where(eq(userSubscriptionsTable.id, existing.id));

    return { action: "extended" as const, expiresAt: expires };
  } else {
    // Buat baru
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    await db.insert(userSubscriptionsTable).values({
      userId,
      planId,
      planName,
      status:    "active",
      startedAt: now,
      expiresAt: expires,
    });

    return { action: "created" as const, expiresAt: expires };
  }
}
