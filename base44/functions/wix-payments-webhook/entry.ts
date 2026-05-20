import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as jose from 'npm:jose@5.9.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();

    const publicKeyPem = Deno.env.get("WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");
    if (!publicKeyPem) {
      console.error("Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");
      return new Response("Unauthorized", { status: 401 });
    }

    // Verify JWT signature
    const publicKey = await jose.importSPKI(publicKeyPem, "RS256");
    const { payload: rawPayload } = await jose.jwtVerify(body, publicKey, { algorithms: ["RS256"] });

    // Double-nested JSON parsing
    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);

    if (event.eventType === "wix.ecom.v1.order_approved") {
      const order = eventData.actionEvent.body.order;
      const checkoutId = order.checkoutId;

      console.log("Order approved, checkoutId:", checkoutId);

      // Find the pending subscription by checkout_id
      const subs = await base44.asServiceRole.entities.Subscription.filter({ checkout_id: checkoutId });
      if (subs.length === 0) {
        console.warn("No pending subscription found for checkoutId:", checkoutId);
        return new Response("OK", { status: 200 });
      }

      const sub = subs[0];
      let subscriptionId = null;

      // Extract subscription ID from line items
      for (const lineItem of order.lineItems || []) {
        if (lineItem.subscriptionInfo?.id) {
          subscriptionId = lineItem.subscriptionInfo.id;
          break;
        }
      }

      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "active",
        subscription_id: subscriptionId,
        activated_at: new Date().toISOString()
      });

      console.log("Subscription activated:", sub.id, "sub_id:", subscriptionId);

    } else if (
      event.eventType === "wix.ecom.subscription_contracts.v1.subscription_contract_canceled" ||
      event.eventType === "wix.ecom.subscription_contracts.v1.subscription_contract_expired"
    ) {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      console.log("Subscription ended:", subscriptionId, "type:", event.eventType);

      const subs = await base44.asServiceRole.entities.Subscription.filter({ subscription_id: subscriptionId });
      if (subs.length > 0) {
        const newStatus = event.eventType.includes("expired") ? "ended" : "canceled";
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: newStatus });
        console.log("Subscription marked:", newStatus);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response("Error", { status: 500 });
  }
});