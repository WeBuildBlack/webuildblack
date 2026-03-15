import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = createServiceClient();

    const userId = session.metadata?.user_id;
    const courseSlug = session.metadata?.course_slug;

    if (!userId || !courseSlug) {
      console.error('Missing metadata in Stripe session', session.id);
      return NextResponse.json({ received: true });
    }

    // Record payment
    await supabase.from('payments').insert({
      user_id: userId,
      course_id: courseSlug,
      stripe_checkout_session_id: session.id,
      amount_cents: session.amount_total || 0,
      status: 'completed',
    });

    // Create enrollment
    await supabase.from('enrollments').upsert({
      user_id: userId,
      course_id: courseSlug,
      access_type: 'paid',
      stripe_payment_id: session.id,
    }, {
      onConflict: 'user_id,course_id',
    });

    // Store Stripe customer ID on profile
    if (session.customer) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: session.customer as string })
        .eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
