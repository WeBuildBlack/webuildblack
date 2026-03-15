import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession({
  priceId,
  courseSlug,
  customerEmail,
  userId,
}: {
  priceId: string;
  courseSlug: string;
  customerEmail: string;
  userId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/courses/${courseSlug}`,
    metadata: {
      course_slug: courseSlug,
      user_id: userId,
    },
  });

  return session;
}
