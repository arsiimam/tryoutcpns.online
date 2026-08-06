import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const SNAP_SANDBOX    = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const SNAP_PRODUCTION = "https://app.midtrans.com/snap/v1/transactions";

/* ------------------------------------------------------------------ */
/* Config cache                                                         */
/* ------------------------------------------------------------------ */
interface MidtransConfig {
  serverKey:   string;
  clientKey:   string;
  environment: "sandbox" | "production";
  ts:          number;
}

let _cache: MidtransConfig | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getMidtransConfig(): Promise<Omit<MidtransConfig, "ts">> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache;

  const rows = await db.select().from(appSettingsTable).where(
    inArray(appSettingsTable.key, [
      "midtrans_server_key",
      "midtrans_client_key",
      "midtrans_environment",
    ])
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  _cache = {
    serverKey:   map["midtrans_server_key"]   || process.env.MIDTRANS_SERVER_KEY   || "",
    clientKey:   map["midtrans_client_key"]   || process.env.MIDTRANS_CLIENT_KEY   || "",
    environment: ((map["midtrans_environment"] || "sandbox") === "production" ? "production" : "sandbox") as "sandbox" | "production",
    ts: Date.now(),
  };
  return _cache;
}

export function invalidateMidtransCache() { _cache = null; }

/* ------------------------------------------------------------------ */
/* Active gateway helper                                               */
/* ------------------------------------------------------------------ */
let _gwCache: { val: "duitku" | "midtrans"; ts: number } | null = null;

export async function getActiveGateway(): Promise<"duitku" | "midtrans"> {
  if (_gwCache && Date.now() - _gwCache.ts < CACHE_TTL_MS) return _gwCache.val;

  const rows = await db.select().from(appSettingsTable).where(
    inArray(appSettingsTable.key, ["active_payment_gateway"])
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const val: "duitku" | "midtrans" =
    map["active_payment_gateway"] === "midtrans" ? "midtrans" : "duitku";
  _gwCache = { val, ts: Date.now() };
  return val;
}

export function invalidateGatewayCache() { _gwCache = null; }

/* ------------------------------------------------------------------ */
/* Snap API                                                             */
/* ------------------------------------------------------------------ */
export interface SnapParams {
  orderId:      string;
  amount:       number;
  customerName: string;
  email:        string;
  productName:  string;
  finishUrl:    string;
  errorUrl:     string;
  pendingUrl:   string;
  notifUrl:     string;
}

export async function createSnapTransaction(params: SnapParams) {
  const cfg  = await getMidtransConfig();
  const url  = cfg.environment === "production" ? SNAP_PRODUCTION : SNAP_SANDBOX;
  const auth = Buffer.from(`${cfg.serverKey}:`).toString("base64");

  const body = {
    transaction_details: {
      order_id:     params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.customerName,
      email:      params.email,
    },
    item_details: [
      {
        id:       params.orderId,
        price:    params.amount,
        quantity: 1,
        name:     params.productName.slice(0, 50),
      },
    ],
    callbacks: {
      finish:  params.finishUrl,
      error:   params.errorUrl,
      pending: params.pendingUrl,
    },
    custom_field1: "tryoutcpns",
  };

  const resp = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Basic ${auth}`,
      "Accept":        "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Midtrans Snap error ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<{ token: string; redirect_url: string }>;
}

/* ------------------------------------------------------------------ */
/* Notification signature verification                                  */
/* ------------------------------------------------------------------ */
export async function verifyMidtransNotification(data: {
  order_id:      string;
  status_code:   string;
  gross_amount:  string;
  signature_key: string;
}): Promise<boolean> {
  const cfg      = await getMidtransConfig();
  const expected = createHash("sha512")
    .update(`${data.order_id}${data.status_code}${data.gross_amount}${cfg.serverKey}`)
    .digest("hex");
  return expected === data.signature_key;
}
