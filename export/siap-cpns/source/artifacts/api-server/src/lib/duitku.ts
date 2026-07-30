import { createHmac } from "node:crypto";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const DUITKU_SANDBOX_BASE    = "https://sandbox.duitku.com/webapi/api/merchant";
const DUITKU_PRODUCTION_BASE = "https://passport.duitku.com/webapi/api/merchant";

/* ------------------------------------------------------------------ */
/* DB-backed credential cache (mirrors Google OAuth pattern)            */
/* ------------------------------------------------------------------ */
interface DuitkuConfig {
  merchantCode: string;
  apiKey: string;
  environment: "sandbox" | "production";
  expiryPeriod: number; // minutes
  ts: number;
}

let _cache: DuitkuConfig | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getDuitkuConfig(): Promise<Omit<DuitkuConfig, "ts">> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return _cache;
  }

  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(
      inArray(appSettingsTable.key, [
        "duitku_merchant_code",
        "duitku_api_key",
        "duitku_environment",
        "duitku_expiry_period",
      ])
    );

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const env = (map["duitku_environment"] || process.env.DUITKU_ENV || "sandbox") === "production"
    ? "production"
    : "sandbox";

  _cache = {
    merchantCode: map["duitku_merchant_code"] || process.env.DUITKU_MERCHANT_CODE || "",
    apiKey:       map["duitku_api_key"]        || process.env.DUITKU_API_KEY        || "",
    environment:  env,
    expiryPeriod: Number(map["duitku_expiry_period"]) || 1440,
    ts: Date.now(),
  };

  return _cache;
}

/** Called by admin route when settings are updated */
export function invalidateDuitkuCredCache() {
  _cache = null;
}

/** Legacy sync helper — still reads process.env directly (used in startup checks) */
export function getDuitkuEnv(): "sandbox" | "production" {
  const env = process.env.DUITKU_ENV || "sandbox";
  return env === "production" ? "production" : "sandbox";
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */
function getBaseUrl(env: "sandbox" | "production"): string {
  return env === "production" ? DUITKU_PRODUCTION_BASE : DUITKU_SANDBOX_BASE;
}

/** HMAC-SHA256 — Duitku signature algorithm (apiKey as secret) */
function hmacSha256(str: string, secret: string): string {
  return createHmac("sha256", secret).update(str).digest("hex");
}

/** Format a Date as "YYYY-MM-DD HH:mm:ss" in local time (as Duitku expects) */
function formatDatetime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
export interface CreateInvoiceParams {
  merchantOrderId: string;
  paymentAmount: number;
  paymentMethod: string;
  productDetails: string;
  customerName: string;
  email: string;
  phoneNumber?: string;
  callbackUrl: string;
  returnUrl: string;
  expiryPeriod?: number;
}

export interface CreateInvoiceResult {
  merchantCode: string;
  reference: string;
  paymentUrl: string;
  vaNumber?: string;
  qrString?: string;
  amount: string;
  statusCode: string;
  statusMessage: string;
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<CreateInvoiceResult> {
  const cfg = await getDuitkuConfig();

  if (!cfg.merchantCode) throw new Error("Duitku Merchant Code belum dikonfigurasi.");
  if (!cfg.apiKey)       throw new Error("Duitku API Key belum dikonfigurasi.");

  const baseUrl   = getBaseUrl(cfg.environment);
  const datetime  = formatDatetime(new Date());
  const signature = hmacSha256(cfg.merchantCode + params.merchantOrderId + params.paymentAmount, cfg.apiKey);

  const maskedKey = cfg.apiKey.slice(0, 4) + "****" + cfg.apiKey.slice(-4);
  console.log("[duitku] env:", cfg.environment, "| merchantCode:", cfg.merchantCode);
  console.log("[duitku] paymentAmount:", params.paymentAmount, "| datetime:", datetime);
  console.log("[duitku] apiKey (masked):", maskedKey, "| signature:", signature);

  const body = {
    merchantCode:    cfg.merchantCode,
    paymentAmount:   params.paymentAmount,
    paymentMethod:   params.paymentMethod,
    merchantOrderId: params.merchantOrderId,
    productDetails:  params.productDetails,
    customerVaName:  params.customerName,
    email:           params.email,
    phoneNumber:     params.phoneNumber ?? "",
    callbackUrl:     params.callbackUrl,
    returnUrl:       params.returnUrl,
    signature,
    expiryPeriod:    params.expiryPeriod ?? cfg.expiryPeriod,
    datetime,
  };

  const res  = await fetch(`${baseUrl}/v2/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Duitku API error ${res.status}: ${text}`);

  try { return JSON.parse(text); }
  catch { throw new Error(`Duitku API invalid JSON: ${text}`); }
}

export interface CheckTransactionResult {
  merchantOrderId: string;
  reference: string;
  amount: string;
  fee: string;
  statusCode: string;   // "00" success, "01" pending, "02" failed
  statusMessage: string;
}

export async function checkTransaction(
  merchantOrderId: string,
  amount: number
): Promise<CheckTransactionResult> {
  const cfg = await getDuitkuConfig();
  if (!cfg.merchantCode) throw new Error("Duitku Merchant Code belum dikonfigurasi.");
  if (!cfg.apiKey)       throw new Error("Duitku API Key belum dikonfigurasi.");

  const signature = hmacSha256(cfg.merchantCode + merchantOrderId + amount, cfg.apiKey);
  const res = await fetch(`${getBaseUrl(cfg.environment)}/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantCode: cfg.merchantCode, merchantOrderId, amount, signature }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Duitku check error ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function verifyCallback(data: Record<string, string>): Promise<boolean> {
  try {
    const cfg = await getDuitkuConfig();
    if (!cfg.merchantCode || !cfg.apiKey) return false;
    const expected = hmacSha256(cfg.merchantCode + data.amount + data.merchantOrderId, cfg.apiKey);
    return data.signature === expected;
  } catch {
    return false;
  }
}

export interface PaymentMethod {
  code: string;
  name: string;
  group: "virtual_account" | "ewallet" | "qris" | "retail" | "card";
}

export function getPaymentMethods(): PaymentMethod[] {
  return [
    { code: "VC",   name: "Kartu Kredit / Debit",      group: "card" },
    { code: "BC",   name: "BCA Virtual Account",        group: "virtual_account" },
    { code: "M2",   name: "Mandiri Virtual Account",    group: "virtual_account" },
    { code: "BT",   name: "Permata Virtual Account",    group: "virtual_account" },
    { code: "I1",   name: "BNI Virtual Account",        group: "virtual_account" },
    { code: "B1",   name: "CIMB Niaga Virtual Account", group: "virtual_account" },
    { code: "A1",   name: "ATM Bersama",                group: "virtual_account" },
    { code: "QRIS", name: "QRIS",                       group: "qris" },
    { code: "OV",   name: "OVO",                        group: "ewallet" },
    { code: "DA",   name: "DANA",                       group: "ewallet" },
    { code: "GP",   name: "GoPay",                      group: "ewallet" },
    { code: "SP",   name: "ShopeePay",                  group: "ewallet" },
    { code: "FT",   name: "Alfamart",                   group: "retail" },
    { code: "IR",   name: "Indomaret",                  group: "retail" },
  ];
}
