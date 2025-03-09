"use server";
import Razorpay from "razorpay";
import { CartItem } from "@/store";

export interface Metadata {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  clerkUserId: string;
}

export async function createCheckoutSession(
  items: CartItem[],
  metadata: Metadata
) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const amount = items.reduce(
      (sum, item) => sum + item.product.price! * 100 * item.quantity,
      0
    );

    // Create order in Razorpay
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: metadata.orderNumber,
      notes: {
        customerName: metadata.customerName,
        customerEmail: metadata.customerEmail,
        clerkUserId: metadata.clerkUserId,
      },
    });

    return order;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
}
