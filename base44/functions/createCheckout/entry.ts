import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLANS = {
  monthly: {
    name: "Syllabist Pro – Monthly",
    price: "9.99",
    subscriptionInfo: {
      subscriptionSettings: { frequency: "MONTH" },
      title: "Syllabist Pro Monthly",
      description: "Full access to AI Tutor, Study Scheduler, Workshop, and all premium features."
    }
  },
  annual: {
    name: "Syllabist Pro – Annual",
    price: "79.99",
    subscriptionInfo: {
      subscriptionSettings: {
        frequency: "YEAR",
        freeTrialPeriod: { frequency: "DAY", interval: 14 }
      },
      title: "Syllabist Pro Annual",
      description: "Full access to all premium features, billed yearly. Includes a 14-day free trial."
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!PLANS[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    const origin = req.headers.get("Origin") || "https://app.base44.com";
    const thankYouUrl = `${origin}/thank-you`;
    const homeUrl = origin;

    const wixRes = await fetch(
      "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": WIX_API_KEY,
          "wix-site-id": WIX_SITE_ID
        },
        body: JSON.stringify({
          cart: {
            items: [{ ...PLANS[plan], quantity: 1 }],
            customerInfo: { email: user.email }
          },
          callbackUrls: {
            thankYouPageUrl: thankYouUrl,
            postFlowUrl: homeUrl
          }
        })
      }
    );

    const data = await wixRes.json();
    if (!wixRes.ok) {
      console.error("Wix error:", JSON.stringify(data));
      return Response.json({ error: data.message || "Checkout creation failed" }, { status: 500 });
    }

    const checkoutId = data.checkoutSession.id;
    const redirectUrl = data.checkoutSession.redirectUrl;

    // Persist pending subscription record for webhook correlation
    await base44.asServiceRole.entities.Subscription.create({
      user_email: user.email,
      checkout_id: checkoutId,
      plan,
      status: "pending"
    });

    return Response.json({ redirectUrl });
  } catch (error) {
    console.error("createCheckout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});