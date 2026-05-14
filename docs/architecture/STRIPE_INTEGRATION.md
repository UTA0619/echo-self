# Stripe Integration — ECHO//SELF

---

## Plans & Pricing

| Plan | Price | Features |
|---|---|---|
| Free | $0 | 7 journal entries/mo, 3 Echo sessions/mo |
| Pro Monthly | $12.99/mo | Unlimited everything, identity graph, future self |
| Pro Annual | $89/yr (~$7.42/mo, save 43%) | Same as Pro Monthly |

**Trial:** 14 days Pro, no credit card required.

---

## Stripe Objects

| Object | ID Prefix | Our Mapping |
|---|---|---|
| Customer | `cus_` | 1:1 with `auth.users` |
| Subscription | `sub_` | 1:1 with `subscriptions.stripe_subscription_id` |
| Price (monthly) | `price_` | `STRIPE_PRICE_MONTHLY` env var |
| Price (annual) | `price_` | `STRIPE_PRICE_ANNUAL` env var |

---

## Checkout Flow

```typescript
// app/api/stripe/checkout/route.ts
export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { plan, successUrl, cancelUrl } = checkoutSchema.parse(await req.json())

  // Get or create Stripe customer
  let { stripe_customer_id } = await getSubscription(user.id)

  if (!stripe_customer_id) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    stripe_customer_id = customer.id
    await updateSubscription(user.id, { stripe_customer_id })
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripe_customer_id,
    mode: 'subscription',
    line_items: [{
      price: plan === 'annual' ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY,
      quantity: 1,
    }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { supabase_user_id: user.id },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return Response.json({ url: session.url })
}
```

---

## Webhook Handler

```typescript
// app/api/stripe/webhook/route.ts
const STRIPE_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }

  if (!STRIPE_EVENTS.includes(event.type)) {
    return Response.json({ received: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan: 'pro',
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id
      if (!userId) break

      await supabaseAdmin.from('subscriptions').update({
        plan: sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free',
        status: sub.status as any,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
      }).eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin.from('subscriptions').update({
        plan: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        canceled_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabaseAdmin.from('subscriptions').update({
        status: 'past_due',
      }).eq('stripe_subscription_id', invoice.subscription as string)
      // TODO: trigger payment failure notification
      break
    }
  }

  return Response.json({ received: true })
}
```

---

## Paywall Enforcement

```typescript
// src/lib/stripe/limits.ts
export const FREE_TIER_LIMITS = {
  journal_entries_per_month: 7,
  echo_sessions_per_month: 3,
  identity_graph: false,
  future_self: false,
  voice_input: false,
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof FREE_TIER_LIMITS
): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getSubscription(userId)

  if (sub.plan === 'pro' && ['active', 'trialing'].includes(sub.status)) {
    return { allowed: true }
  }

  // Free tier checks
  if (feature === 'journal_entries_per_month') {
    const allowed = sub.entries_this_month < FREE_TIER_LIMITS.journal_entries_per_month
    return {
      allowed,
      reason: allowed ? undefined : `You've used all 7 free entries this month. Upgrade to Pro for unlimited.`,
    }
  }

  if (feature === 'identity_graph' || feature === 'future_self') {
    return { allowed: false, reason: 'Identity features are Pro only.' }
  }

  return { allowed: false, reason: 'This feature requires Pro.' }
}
```

---

## Testing

Use Stripe test mode + `stripe trigger` CLI:

```bash
# Simulate subscription events locally
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed

# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.  
Payment failure card: `4000 0000 0000 0341`
