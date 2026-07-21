import { createHmac } from "node:crypto";

const DUITKU_SANDBOX_BASE = "https://sandbox.duitku.com/webapi/api/merchant";
const DUITKU_PRODUCTION_BASE = "https://passport.duitku.com/webapi/api/merchant";

export function getDuitkuEnv(): "sandbox" | "production" {
  const env = process.env.DUITKU_ENV || "sandbox";
  return env === "production" ? "production" : "sandbox";
}

function getBaseUrl(): string {
  return getDuitkuEnv() === "production"
    ? DUITKU_PRODUCTION_BASE
    : DUITKU_SANDBOX_BASE;
}

function getMerchantCode(): string {
  const code = process.env.DUITKU_MERCHANT_CODE?.trim();
  if (!code) throw new Error("DUITKU_MERCHANT_CODE not set");
  return code;
}

function getApiKey(): string {
  const key = process.env.DUITKU_API_KEY?.trim();
  if (!key) throw new Error("DUITKU_API_KEY not set");
  return key;
}

/** HMAC-SHA256 — the current Duitku signature algorithm (MD5 is obsolete). */
function hmacSha256(stringToSign: string, secret: string): string {
  return createHmac("sha256", secret).update(stringToSign).digest("hex");
}

/** Format a Date as "YYYY-MM-DD HH:mm:ss" in local time (as Duitku expects). */
function formatDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

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
  expiryPeriod?: number; // minutes, default 1440 (24 h)
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
  const merchantCode = getMerchantCode();
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  // Duitku v2/inquiry signature:
  //   stringToSign = merchantCode + paymentAmount + datetime
  //   signature    = HMAC_SHA256(stringToSign, apiKey)
  const datetime = formatDatetime(new Date());
  const stringToSign = merchantCode + params.paymentAmount + datetime;
  const signature = hmacSha256(stringToSign, apiKey);

  // Debug — log masked values so we can verify without leaking the key
  const maskedKey = apiKey.slice(0, 4) + "****" + apiKey.slice(-4);
  console.log("[duitku] merchantCode:", merchantCode);
  console.log("[duitku] paymentAmount:", params.paymentAmount, "(type:", typeof params.paymentAmount, ")");
  console.log("[duitku] datetime:", datetime);
  console.log("[duitku] stringToSign:", `"${merchantCode}${params.paymentAmount}${datetime}"`);
  console.log("[duitku] apiKey (masked):", maskedKey);
  console.log("[duitku] signature:", signature);

  const body = {
    merchantCode,
    paymentAmount: params.paymentAmount,
    paymentMethod: params.paymentMethod,
    merchantOrderId: params.merchantOrderId,
    productDetails: params.productDetails,
    customerVaName: params.customerName,
    email: params.email,
    phoneNumber: params.phoneNumber ?? "",
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    signature,
    expiryPeriod: params.expiryPeriod ?? 1440,
    datetime,
  };

  const res = await fetch(`${baseUrl}/v2/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Duitku API error ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Duitku API invalid JSON: ${text}`);
  }
}

export interface CheckTransactionResult {
  merchantOrderId: string;
  reference: string;
  amount: string;
  fee: string;
  statusCode: string; // "00" success, "01" pending, "02" failed
  statusMessage: string;
}

export async function checkTransaction(
  merchantOrderId: string,
  amount: number
): Promise<CheckTransactionResult> {
  const merchantCode = getMerchantCode();
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  // Check-transaction signature:
  //   stringToSign = merchantCode + merchantOrderId + paymentAmount
  //   signature    = HMAC_SHA256(stringToSign, apiKey)
  const stringToSign = merchantCode + merchantOrderId + amount;
  const signature = hmacSha256(stringToSign, apiKey);

  const res = await fetch(`${baseUrl}/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantCode, merchantOrderId, amount, signature }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Duitku check error ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

export function verifyCallback(data: Record<string, string>): boolean {
  try {
    const merchantCode = getMerchantCode();
    const apiKey = getApiKey();
    // Callback signature:
    //   stringToSign = merchantCode + amount + merchantOrderId
    //   signature    = HMAC_SHA256(stringToSign, apiKey)
    const stringToSign = merchantCode + data.amount + data.merchantOrderId;
    const expected = hmacSha256(stringToSign, apiKey);
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
    { code: "VC", name: "Kartu Kredit / Debit",      group: "card" },
    { code: "BC", name: "BCA Virtual Account",        group: "virtual_account" },
    { code: "M2", name: "Mandiri Virtual Account",    group: "virtual_account" },
    { code: "BT", name: "Permata Virtual Account",    group: "virtual_account" },
    { code: "I1", name: "BNI Virtual Account",        group: "virtual_account" },
    { code: "B1", name: "CIMB Niaga Virtual Account", group: "virtual_account" },
    { code: "A1", name: "ATM Bersama",                group: "virtual_account" },
    { code: "QRIS", name: "QRIS",                     group: "qris" },
    { code: "OV", name: "OVO",                        group: "ewallet" },
    { code: "DA", name: "DANA",                       group: "ewallet" },
    { code: "GP", name: "GoPay",                      group: "ewallet" },
    { code: "SP", name: "ShopeePay",                  group: "ewallet" },
    { code: "FT", name: "Alfamart",                   group: "retail" },
    { code: "IR", name: "Indomaret",                  group: "retail" },
  ];
}
