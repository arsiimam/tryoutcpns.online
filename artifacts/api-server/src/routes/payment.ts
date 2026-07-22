import { Router } from "express";
import {
  createInvoice,
  checkTransaction,
  verifyCallback,
  getPaymentMethods,
  getDuitkuConfig,
} from "../lib/duitku";
import { logger } from "../lib/logger";

const router = Router();

/** GET /api/payment/config */
router.get("/payment/config", async (_req, res) => {
  try {
    const cfg = await getDuitkuConfig();
    res.json({
      environment: cfg.environment,
      methods: getPaymentMethods(),
      merchantConfigured: !!(cfg.merchantCode && cfg.apiKey),
    });
  } catch {
    res.json({
      environment: "sandbox",
      methods: getPaymentMethods(),
      merchantConfigured: false,
    });
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
    } = req.body as {
      planId: string;
      planName: string;
      amount: number;
      paymentMethod: string;
      customerName: string;
      email: string;
      discountAmount?: number;
    };

    if (!planId || !amount || !paymentMethod || !customerName || !email) {
      return res.status(400).json({ error: "Field wajib tidak lengkap" });
    }

    const replitDomains = process.env.REPLIT_DOMAINS;
    const devDomain     = process.env.REPLIT_DEV_DOMAIN;
    const host = replitDomains
      ? `https://${replitDomains.split(",")[0].trim()}`
      : devDomain
        ? `https://${devDomain}`
        : `http://localhost:${process.env.PORT || 8080}`;

    const merchantOrderId = `CPNS-${planId.toUpperCase().replace(/\s+/g, "")}-${Date.now()}`;
    const finalAmount     = Math.max(10000, amount - discountAmount);

    const cfg = await getDuitkuConfig();
    logger.info(
      { merchantOrderId, paymentMethod, finalAmount, env: cfg.environment },
      "Creating Duitku invoice"
    );

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

    logger.info(
      { merchantOrderId, reference: result.reference, statusCode: result.statusCode },
      "Duitku invoice created"
    );

    return res.json({
      merchantOrderId,
      paymentUrl:    result.paymentUrl,
      reference:     result.reference,
      vaNumber:      result.vaNumber,
      qrString:      result.qrString,
      amount:        finalAmount,
      statusCode:    result.statusCode,
      statusMessage: result.statusMessage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Payment create failed");
    return res.status(500).json({ error: message });
  }
});

/** POST /api/payment/callback */
router.post("/payment/callback", async (req, res) => {
  try {
    const data = req.body as Record<string, string>;

    if (!(await verifyCallback(data))) {
      logger.warn({ body: data }, "Duitku callback signature mismatch");
      return res.status(403).send("INVALID_SIGNATURE");
    }

    const { merchantOrderId, resultCode, amount } = data;

    if (resultCode === "00") {
      logger.info({ merchantOrderId, amount }, "Payment SUCCESS — activate subscription here");
      // TODO: activate subscription in DB for the user linked to merchantOrderId
    } else {
      logger.info({ merchantOrderId, resultCode }, "Payment FAILED or PENDING");
    }

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
