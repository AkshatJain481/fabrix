import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = req.headers;
  const signature = headersList.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "No Signature" }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  if (!webhookSecret) {
    console.log("Razorpay webhook secret is not set");
    return NextResponse.json(
      { error: "Webhook secret not set" },
      { status: 400 }
    );
  }

  // Verify Signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  if (event.event === "payment.captured") {
    try {
      await createOrderInSanity(event.payload.payment.entity);
    } catch (error) {
      console.error("Error creating order in Sanity:", error);
      return NextResponse.json(
        { error: `Error creating order: ${error}` },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function createOrderInSanity(payment: any) {
  const { id, amount, currency, email, notes, created_at } = payment;

  const orderNumber = notes?.orderNumber || `ORD-${id}`;
  const customerName = notes?.customerName || "Unknown";
  const clerkUserId = notes?.clerkUserId || "";

  const order = await backendClient.create({
    _type: "order",
    orderNumber,
    razorpayPaymentId: id,
    customerName,
    clerkUserId,
    email,
    currency,
    totalPrice: amount / 100, // Convert paise to INR
    status: "paid",
    orderDate: new Date(created_at * 1000).toISOString(),
  });

  return order;
}
