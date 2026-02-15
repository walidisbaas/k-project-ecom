/**
 * IMPORTANT: The node adapter MUST be imported before any other @shopify/shopify-api imports.
 * Without this, all API calls throw "fetch is not defined" errors.
 */
import "@shopify/shopify-api/adapters/node";
import {
  shopifyApi,
  ApiVersion,
  Session,
} from "@shopify/shopify-api";
import Bottleneck from "bottleneck";
import { decryptToken } from "@/lib/encryption";
import { buildTrackingUrl } from "./tracking-urls";
import type {
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyFulfillment,
} from "@/types";

// Per-store rate limiters: 2 req/sec (Shopify bucket: 40/min, refills at 2/sec)
const storeLimiters = new Map<string, Bottleneck>();

function getLimiter(storeId: string): Bottleneck {
  if (!storeLimiters.has(storeId)) {
    storeLimiters.set(
      storeId,
      new Bottleneck({ maxConcurrent: 2, minTime: 500 })
    );
  }
  return storeLimiters.get(storeId)!;
}

function createShopifyApi(shopDomain: string) {
  return shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: [
      "read_orders",
      "read_products",
      "read_customers",
      "read_fulfillments",
    ],
    hostName: shopDomain,
    apiVersion: ApiVersion.January26,
    isEmbeddedApp: false,
  });
}

async function makeShopifyRequest<T>(
  storeId: string,
  shopDomain: string,
  encryptedToken: string,
  fn: (
    client: ReturnType<typeof createShopifyApi>["rest"],
    session: Session
  ) => Promise<T>
): Promise<T> {
  const limiter = getLimiter(storeId);
  const shopify = createShopifyApi(shopDomain);
  const accessToken = decryptToken(encryptedToken);

  const session = new Session({
    id: `offline_${shopDomain}`,
    shop: shopDomain,
    state: "offline",
    isOnline: false,
    accessToken,
  });

  return limiter.schedule(() => fn(shopify.rest, session));
}

export async function findOrderByNumber(
  storeId: string,
  shopDomain: string,
  encryptedToken: string,
  orderNumber: string
): Promise<ShopifyOrder | null> {
  try {
    return await makeShopifyRequest(
      storeId,
      shopDomain,
      encryptedToken,
      async (Rest, session) => {
        // Shopify order numbers can be "#1234" or just "1234"
        const name = orderNumber.startsWith("#")
          ? orderNumber
          : `#${orderNumber}`;

        const response = await Rest.Order.all({
          session,
          name,
          status: "any",
          limit: 1,
        });

        const orders = response.data;
        if (!orders || orders.length === 0) return null;

        const order = orders[0]!;
        const fulfillment =
          order.fulfillments && order.fulfillments.length > 0
            ? order.fulfillments[order.fulfillments.length - 1]!
            : null;

        const trackingNumber = fulfillment?.tracking_number ?? null;
        const carrier = fulfillment?.tracking_company ?? null;

        return {
          id: String(order.id),
          order_number: String(order.order_number),
          name: order.name ?? name,
          email: order.email ?? null,
          financial_status: order.financial_status ?? "unknown",
          fulfillment_status: order.fulfillment_status ?? null,
          tracking_number: trackingNumber,
          tracking_url:
            fulfillment?.tracking_url ??
            buildTrackingUrl(carrier, trackingNumber ?? "") ??
            null,
          carrier,
          line_items: (order.line_items ?? []).map(
            (item: {
              title?: string;
              quantity?: number;
              variant_title?: string | null;
              fulfillment_status?: string | null;
            }) => ({
              title: item.title ?? "",
              quantity: item.quantity ?? 1,
              variant_title: item.variant_title ?? null,
              fulfillment_status: item.fulfillment_status ?? null,
            })
          ),
          created_at: order.created_at ?? new Date().toISOString(),
          updated_at: order.updated_at ?? new Date().toISOString(),
        } satisfies ShopifyOrder;
      }
    );
  } catch (err) {
    // Non-fatal: return null and continue processing
    console.error("[shopify] findOrderByNumber error:", {
      storeId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

export async function findCustomerByEmail(
  storeId: string,
  shopDomain: string,
  encryptedToken: string,
  customerEmail: string
): Promise<ShopifyCustomer | null> {
  try {
    return await makeShopifyRequest(
      storeId,
      shopDomain,
      encryptedToken,
      async (Rest, session) => {
        const response = await Rest.Customer.all({
          session,
          email: customerEmail,
          limit: 1,
        });

        const customers = response.data;
        if (!customers || customers.length === 0) return null;

        const customer = customers[0]!;
        return {
          id: String(customer.id),
          email: customer.email ?? customerEmail,
          first_name: customer.first_name ?? null,
          last_name: customer.last_name ?? null,
          orders_count: customer.orders_count ?? 0,
        };
      }
    );
  } catch {
    return null;
  }
}

export async function getCustomerOrders(
  storeId: string,
  shopDomain: string,
  encryptedToken: string,
  customerId: string,
  limit = 5
): Promise<ShopifyOrder[]> {
  try {
    return await makeShopifyRequest(
      storeId,
      shopDomain,
      encryptedToken,
      async (Rest, session) => {
        const response = await Rest.Order.all({
          session,
          customer_id: customerId,
          status: "any",
          limit,
        });

        return (response.data ?? []).map(
          (order: {
            id?: number | string;
            order_number?: number | string;
            name?: string;
            email?: string | null;
            financial_status?: string;
            fulfillment_status?: string | null;
            fulfillments?: Array<{
              tracking_number?: string | null;
              tracking_url?: string | null;
              tracking_company?: string | null;
            }>;
            line_items?: Array<{
              title?: string;
              quantity?: number;
              variant_title?: string | null;
              fulfillment_status?: string | null;
            }>;
            created_at?: string;
            updated_at?: string;
          }) => {
            const fulfillment =
              order.fulfillments && order.fulfillments.length > 0
                ? order.fulfillments[order.fulfillments.length - 1]!
                : null;
            const trackingNumber = fulfillment?.tracking_number ?? null;
            const carrier = fulfillment?.tracking_company ?? null;

            return {
              id: String(order.id),
              order_number: String(order.order_number),
              name: order.name ?? `#${order.order_number}`,
              email: order.email ?? null,
              financial_status: order.financial_status ?? "unknown",
              fulfillment_status: order.fulfillment_status ?? null,
              tracking_number: trackingNumber,
              tracking_url:
                fulfillment?.tracking_url ??
                buildTrackingUrl(carrier, trackingNumber ?? "") ??
                null,
              carrier,
              line_items: (order.line_items ?? []).map(
                (item: {
                  title?: string;
                  quantity?: number;
                  variant_title?: string | null;
                  fulfillment_status?: string | null;
                }) => ({
                  title: item.title ?? "",
                  quantity: item.quantity ?? 1,
                  variant_title: item.variant_title ?? null,
                  fulfillment_status: item.fulfillment_status ?? null,
                })
              ),
              created_at: order.created_at ?? new Date().toISOString(),
              updated_at: order.updated_at ?? new Date().toISOString(),
            } satisfies ShopifyOrder;
          }
        );
      }
    );
  } catch {
    return [];
  }
}

export async function getOrderFulfillments(
  storeId: string,
  shopDomain: string,
  encryptedToken: string,
  orderId: string
): Promise<ShopifyFulfillment[]> {
  try {
    return await makeShopifyRequest(
      storeId,
      shopDomain,
      encryptedToken,
      async (Rest, session) => {
        const response = await Rest.Fulfillment.all({
          session,
          order_id: orderId,
        });

        return (response.data ?? []).map(
          (f: {
            id?: number | string;
            status?: string;
            tracking_number?: string | null;
            tracking_url?: string | null;
            tracking_company?: string | null;
          }) => ({
            id: String(f.id),
            status: f.status ?? "unknown",
            tracking_number: f.tracking_number ?? null,
            tracking_url: f.tracking_url ?? null,
            tracking_company: f.tracking_company ?? null,
          })
        );
      }
    );
  } catch {
    return [];
  }
}
