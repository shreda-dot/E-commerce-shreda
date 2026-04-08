// PayPal REST API helpers — uses Node's built-in fetch (requires Node 18+)
// Sandbox docs: https://developer.paypal.com/api/rest/

const PAYPAL_BASE =
  process.env.PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Creates a PayPal order and returns the full PayPal response (includes order.id).
 * @param {number} amountCents  Total in cents (e.g. 4999 → $49.99)
 */
export async function createPayPalOrder(amountCents) {
  const accessToken = await getAccessToken();
  const value = (amountCents / 100).toFixed(2);

  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: 'Shreda Store Order',
          amount: {
            currency_code: 'USD',
            value,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal create-order failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Captures an approved PayPal order. Returns the full capture response.
 * Status will be "COMPLETED" on success.
 * @param {string} paypalOrderId
 */
export async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal capture failed (${response.status}): ${text}`);
  }

  return response.json();
}
