import { createHash } from "node:crypto";

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
  const code = process.env.DUITKU_MERCHANT_CODE;
  if (!code) throw new Error("DUITKU_MERCHANT_CODE not set");
  return code;
}

function getApiKey(): string {
  const key = process.env.DUITKU_API_KEY;
  if (!key) throw new Error("DUITKU_API_KEY not set");
  return key;
}

export function md5(str: string): string {
  return createHash("md5").update(str).digest("hex");
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
  expiryPeriod?: number; // minutes, default 1440 (24h)
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

  const signature = md5(
    merchantCode + params.paymentAmount + params.merchantOrderId + apiKey
  );

  const body = {
    merchantCode,
    paymentAmount: params.paymentAmount,
    paymentMethod: params.paymentMethod,
    merchantOrderId: params.merchantOrderId,
    productDetails: params.productDetails,
    customerVaName: params.customerName,
    email: params.email,
    phoneNumber: params.phoneNumber || "",
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    signature,
    expiryPeriod: params.expiryPeriod ?? 1440,
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
  merchantOrderId: string
): Promise<CheckTransactionResult> {
  const merchantCode = getMerchantCode();
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  const signature = md5(merchantCode + merchantOrderId + apiKey);

  const res = await fetch(`${baseUrl}/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantCode, merchantOrderId, signature }),
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
    // Duitku callback signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
    const expected = md5(
      merchantCode + data.amount + data.merchantOrderId + apiKey
    );
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
    { code: "VC", name: "Kartu Kredit / Debit", group: "card" },
    { code: "BC", name: "BCA Virtual Account", group: "virtual_account" },
    { code: "M2", name: "Mandiri Virtual Account", group: "virtual_account" },
    { code: "BT", name: "Permata Virtual Account", group: "virtual_account" },
    { code: "I1", name: "BNI Virtual Account", group: "virtual_account" },
    { code: "B1", name: "CIMB Niaga Virtual Account", group: "virtual_account" },
    { code: "A1", name: "ATM Bersama", group: "virtual_account" },
    { code: "QRIS", name: "QRIS", group: "qris" },
    { code: "OV", name: "OVO", group: "ewallet" },
    { code: "DA", name: "DANA", group: "ewallet" },
    { code: "GP", name: "GoPay", group: "ewallet" },
    { code: "SP", name: "ShopeePay", group: "ewallet" },
    { code: "FT", name: "Alfamart", group: "retail" },
    { code: "IR", name: "Indomaret", group: "retail" },
  ];
}
