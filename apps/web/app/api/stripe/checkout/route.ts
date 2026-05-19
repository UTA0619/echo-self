import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!
const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY!
const PRICE_ID_ANNUAL = process.env.STRIPE_PRICE_ID_ANNUAL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan = 'monthly' } = await req.json() as { plan?: 'monthly' | 'annual' }

  Sentry.setUser({ id: user.id })

  try {
    const priceId = plan === 'annual' ? PRICE_ID_ANNUAL : PRICE_ID_MONTHLY

    // Check if existing Stripe customer
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const body: Record<string, unknown> = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/settings?upgrade=success`,
      cancel_url: `${APP_URL}/settings?upgrade=canceled`,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
    }

    if (sub?.stripe_customer_id) {
      body.customer = sub.stripe_customer_id
    } else {
      body.customer_email = user.email
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(flattenStripeParams(body)).toString(),
    })

    if (!res.ok) {
      const err = await res.json() as { error: { message: string } }
      throw new Error(err.error.message)
    }

    const session = await res.json() as { url: string }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    Sentry.captureException(err)
    console.error('stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

function flattenStripeParams(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (value === null || value === undefined) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenStripeParams(value as Record<string, unknown>, fullKey))
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          Object.assign(result, flattenStripeParams(item as Record<string, unknown>, `${fullKey}[${i}]`))
        } else {
          result[`${fullKey}[${i}]`] = String(item)
        }
      })
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}
