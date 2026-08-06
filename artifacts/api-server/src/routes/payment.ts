import { Router } from "express";
import {
  createInvoice,
  checkTransaction,
  verifyCallback,
  getPaymentMethods,
  getDuitkuConfig,
} from "../lib/duitku";
import {
  getMidtransConfig,
  getActiveGateway,
  createSnapTransaction,
  verifyMidtransNotification,
} from "../lib/midtrans";
import { db } from "@workspace/db";
import {
  paymentTransactionsTable,
  userSubscriptionsTable,
  subscriptionPlansTable,
  couponsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { activateOrExtendSubscription } from "../lib/subscription-helper";

const router = Router();

/** POST /api/payment/validate-coupon */
router.post("/payment/validate-coupon", async (req, res) => {
  try {
    const { code, amount } = req.body as { code: string; amount: number };
    if (!code?.trim() || !amount) return res.status(400).json({ valid: false, error: "code dan amount diperlukan." });

    const [coupon] = await db.select().from(couponsTable)
      .where(eq(couponsTable.code, code.trim().toUpperCase()));

    if (!coupon)         return res.json({ valid: false, error: "Kode kupon tidak ditemukan." });
    if (!coupon.isActive) return res.json({ valid: false, error: "Kupon tidak aktif." });

    const now = new Date();
    if (now < coupon.validFrom)  return res.json({ valid: false, error: "Kupon belum berlaku." });
    if (now > coupon.validUntil) return res.json({ valid: false, error: "Kupon sudah kedaluwarsa." });
    if (coupon.usedCount >= coupon.quota) return res.json({ valid: false, error: "Kuota kupon sudah habis." });
    if (coupon.minPurchase > 0 && amount < coupon.minPurchase) {
      return res.json({ valid: false, error: `Minimum pembelian Rp ${coupon.minPurchase.toLocaleString("id-ID")} untuk kupon ini.` });
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round(amount * coupon.discountValue / 100);
      if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = Math.min(coupon.discountValue, amount);
    }

    return res.json({
      valid: true,
      discount,
      couponId: coupon.id,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

/** GET /api/payment/config */
router.get("/payment/config", async (_req, res) => {
  try {
    const activeGateway = await getActiveGateway();

    if (activeGateway === "midtrans") {
      const mt = await getMidtransConfig();
      return res.json({
        activeGateway: "midtrans",
        environment:   mt.environment,
        methods:       [],
        merchantConfigured: !!(mt.serverKey && mt.clientKey),
        midtransClientKey:  mt.clientKey,
        midtransConfigured: !!(mt.serverKey && mt.clientKey),
      });
    }

    const cfg = await getDuitkuConfig();
    return res.json({
      activeGateway:      "duitku",
      environment:        cfg.environment,
      methods:            getPaymentMethods(),
      merchantConfigured: !!(cfg.merchantCode && cfg.apiKey),
    });
  } catch {
    res.json({ activeGateway: "duitku", environment: "sandbox", methods: getPaymentMethods(), merchantConfigured: false });
  }
});

/** POST /api/payment/create */
router.post("/payment/create", async (req, res) => {
  try {
    const {
      planId,
      planName,
      amount,
      paymentMethod,
      customerName,
      email,
      discountAmount = 0,
      couponCode,
      couponId,
    } = req.body as {
      planId: string; planName: string; amount: number;
      paymentMethod?: string; customerName: string; email: string;
      discountAmount?: number; couponCode?: string; couponId?: number;
    };

    if (!planId || !amount || !customerName || !email) {
      return res.status(400).json({ error: "Field wajib tidak lengkap" });
    }

    const replitDomains = process.env.REPLIT_DOMAINS;
    const devDomain     = process.env.REPLIT_DEV_DOMAIN;
    const host = replitDomains
      ? `https://${replitDomains.split(",")[0].trim()}`
      : devDomain ? `https://${devDomain}` : `http://localhost:${process.env.PORT || 8080}`;

    const epochSec        = Math.floor(Date.now() / 1000).toString();
    const maxSlugLen      = 50 - 5 - 1 - epochSec.length;
    const planSlug        = planId.toUpperCase().replace(/\s+/g, "").slice(0, maxSlugLen);
    const merchantOrderId = `CPNS-${planSlug}-${epochSec}`;
    const finalAmount     = Math.max(10000, amount - discountAmount);

    const userId: string | null = (req as any).session?.userId ?? null;
    const activeGateway = await getActiveGateway();

    /* ── Midtrans ── */
    if (activeGateway === "midtrans") {
      const finishUrl = `${host}/subscription?status=success&orderId=${merchantOrderId}`;
      logger.info({ merchantOrderId, finalAmount }, "Creating Midtrans Snap transaction");

      const snap = await createSnapTransaction({
        orderId:      merchantOrderId,
        amount:       finalAmount,
        customerName,
        email,
        productName:  `Tryout CPNS Online - ${planName}`,
        finishUrl,
        errorUrl:     `${host}/subscription?status=error&orderId=${merchantOrderId}`,
        pendingUrl:   `${host}/subscription?status=pending&orderId=${merchantOrderId}`,
        notifUrl:     `${host}/api/payment/midtrans-notification`,
      });

      await db.insert(paymentTransactionsTable).values({
        userId,
        merchantOrderId,
        planId,
        planName,
        amount:     finalAmount,
        status:     "pending",
        expiresAt:  new Date(Date.now() + 24 * 60 * 60 * 1000),
        couponCode: couponCode?.trim().toUpperCase() ?? null,
        couponId:   couponId ?? null,
        gateway:    "midtrans",
      });

      logger.info({ merchantOrderId, token: snap.token }, "Midtrans Snap transaction created");
      return res.json({
        merchantOrderId,
        paymentUrl:      snap.redirect_url,
        snapToken:       snap.token,
        amount:          finalAmount,
        gateway:         "midtrans",
      });
    }

    /* ── Duitku ── */
    if (!paymentMethod) {
      return res.status(400).json({ error: "paymentMethod wajib untuk Duitku" });
    }

    const cfg      = await getDuitkuConfig();
    const expiresAt = new Date(Date.now() + cfg.expiryPeriod * 60 * 1000);

    logger.info({ merchantOrderId, paymentMethod, finalAmount, env: cfg.environment }, "Creating Duitku invoice");

    const result = await createInvoice({
      merchantOrderId,
      paymentAmount:  finalAmount,
      paymentMethod,
      productDetails: `Tryout CPNS Online - ${planName}`,
      customerName,
      email,
      callbackUrl: `${host}/api/payment/callback`,
      returnUrl:   `${host}/subscription?status=success&orderId=${merchantOrderId}`,
    });

    await db.insert(paymentTransactionsTable).values({
      userId,
      merchantOrderId,
      planId,
      planName,
      amount:          finalAmount,
      status:          "pending",
      paymentMethod,
      duitkuReference: result.reference,
      expiresAt,
      couponCode:      couponCode?.trim().toUpperCase() ?? null,
      couponId:        couponId ?? null,
      gateway:         "duitku",
    });

    logger.info({ merchantOrderId, reference: result.reference }, "Duitku invoice created");
    return res.json({
      merchantOrderId,
      paymentUrl:    result.paymentUrl,
      reference:     result.reference,
      vaNumber:      result.vaNumber,
      qrString:      result.qrString,
      amount:        finalAmount,
      statusCode:    result.statusCode,
      statusMessage: result.statusMessage,
      gateway:       "duitku",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Payment create failed");
    return res.status(500).json({ error: message });
  }
});

/** POST /api/payment/midtrans-notification — called by Midtrans */
router.post("/payment/midtrans-notification", async (req, res) => {
  try {
    const data = req.body as Record<string, string>;
    const { order_id, transaction_status, fraud_status, status_code, gross_amount, signature_key } = data;

    if (!(await verifyMidtransNotification({ order_id, status_code, gross_amount, signature_key }))) {
      logger.warn({ order_id }, "Midtrans notification signature mismatch");
      return res.status(403).send("INVALID_SIGNATURE");
    }

    // Determine status
    const isSuccess =
      (transaction_status === "capture" && fraud_status === "accept") ||
      transaction_status === "settlement";
    const isFailed  = ["deny", "cancel", "expire"].includes(transaction_status);
    const newStatus = isSuccess ? "success" : isFailed ? "failed" : "pending";

    const [tx] = await db
      .update(paymentTransactionsTable)
      .set({
        status:       newStatus,
        callbackData: JSON.stringify(data),
        updatedAt:    new Date(),
      })
      .where(eq(paymentTransactionsTable.merchantOrderId, order_id))
      .returning();

    if (isSuccess && tx?.userId) {
      let durationDays = 30;
      try {
        const [plan] = await db
          .select({ durationDays: subscriptionPlansTable.durationDays })
          .from(subscriptionPlansTable)
          .where(eq(subscriptionPlansTable.id, tx.planId))
          .limit(1);
        if (plan?.durationDays) durationDays = plan.durationDays;
      } catch { /* keep default */ }

      const result = await activateOrExtendSubscription({
        userId: tx.userId, planId: tx.planId, planName: tx.planName, durationDays,
      });
      logger.info({ order_id, userId: tx.userId, durationDays, ...result }, "Subscription activated via Midtrans");

      if (tx.couponId) {
        try {
          await db.update(couponsTable)
            .set({ usedCount: sql`used_count + 1`, updatedAt: new Date() })
            .where(eq(couponsTable.id, tx.couponId));
        } catch (e) { logger.warn({ e }, "Failed to increment coupon usedCount"); }
      }
    }

    logger.info({ order_id, transaction_status, newStatus }, "Midtrans notification processed");
    return res.status(200).json({ status: "OK" });
  } catch (err) {
    logger.error({ err }, "Midtrans notification error");
    return res.status(500).send("ERROR");
  }
});

/** POST /api/payment/callback — called by Duitku */
router.post("/payment/callback", async (req, res) => {
  try {
    const data = req.body as Record<string, string>;

    if (!(await verifyCallback(data))) {
      logger.warn({ body: data }, "Duitku callback signature mismatch");
      return res.status(403).send("INVALID_SIGNATURE");
    }

    const { merchantOrderId, resultCode, amount, reference, paymentCode } = data;
    const isSuccess = resultCode === "00";

    // Update transaction status
    const newStatus = isSuccess ? "success" : resultCode === "01" ? "pending" : "failed";
    const [tx] = await db
      .update(paymentTransactionsTable)
      .set({
        status:          newStatus,
        duitkuReference: reference ?? undefined,
        paymentMethod:   paymentCode ?? undefined,
        callbackData:    JSON.stringify(data),
        updatedAt:       new Date(),
      })
      .where(eq(paymentTransactionsTable.merchantOrderId, merchantOrderId))
      .returning();

    if (isSuccess && tx?.userId) {
      // Look up plan duration from subscription_plans; fallback 30 days
      let durationDays = 30;
      try {
        const [plan] = await db
          .select({ durationDays: subscriptionPlansTable.durationDays })
          .from(subscriptionPlansTable)
          .where(eq(subscriptionPlansTable.id, tx.planId))
          .limit(1);
        if (plan?.durationDays) durationDays = plan.durationDays;
      } catch { /* keep default */ }

      const result = await activateOrExtendSubscription({
        userId: tx.userId, planId: tx.planId, planName: tx.planName, durationDays,
      });
      logger.info({ merchantOrderId, userId: tx.userId, planId: tx.planId, durationDays, ...result }, "Subscription activated");

      // Increment coupon usedCount if a coupon was applied
      if (tx.couponId) {
        try {
          await db.update(couponsTable)
            .set({ usedCount: sql`used_count + 1`, updatedAt: new Date() })
            .where(eq(couponsTable.id, tx.couponId));
          logger.info({ merchantOrderId, couponId: tx.couponId }, "Coupon usedCount incremented");
        } catch (couponErr) {
          logger.warn({ couponErr }, "Failed to increment coupon usedCount");
        }
      }
    }

    logger.info({ merchantOrderId, resultCode, newStatus }, "Payment callback processed");
    return res.status(200).send("SUCCESS");
  } catch (err) {
    logger.error({ err }, "Payment callback error");
    return res.status(500).send("ERROR");
  }
});

/** GET /api/payment/check/:merchantOrderId?amount=99000 */
router.get("/payment/check/:merchantOrderId", async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const amount = Number(req.query.amount) || 0;
    const result = await checkTransaction(merchantOrderId, amount);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Check transaction failed");
    return res.status(500).json({ error: message });
  }
});

export default router;
