import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

async function verifyStripeSignature(payload: string, signature: string): Promise<boolean> {
  const parts = signature.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')?.[1]
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')?.[1]
  if (!timestamp || !sig) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signedData = `${timestamp}.${payload}`
  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedData))
  const expectedHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return expectedHex === sig
}

serve(async (req: Request) => {
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) return new Response('Missing signature', { status: 400 })

    const payload = await req.text()
    const isValid = await verifyStripeSignature(payload, signature)
    if (!isValid) return new Response('Invalid signature', { status: 400 })

    const event = JSON.parse(payload) as { type: string; id: string; data: { object: Record<string, unknown> } }
    const supabase = getServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId = session['customer'] as string
        const subscriptionId = session['subscription'] as string
        const userId = session['metadata'] ? (session['metadata'] as Record<string, string>)['user_id'] : null
        if (userId) {
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            plan: 'premium_monthly',
          })
          await supabase.from('users').update({ subscription_tier: 'premium' }).eq('id', userId)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await supabase.from('subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: false })
          .eq('stripe_subscription_id', sub['id'] as string)
        const { data: subscription } = await supabase.from('subscriptions')
          .select('user_id').eq('stripe_subscription_id', sub['id'] as string).single()
        if (subscription) {
          await supabase.from('users').update({ subscription_tier: 'free' }).eq('id', subscription.user_id)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const status = sub['status'] as string
        const cancelAtPeriodEnd = sub['cancel_at_period_end'] as boolean
        const currentPeriodEnd = sub['current_period_end'] as number
        const priceId = (
          (sub['items'] as Record<string, unknown>)?.['data'] as Record<string, unknown>[]
        )?.[0]?.['price']
          ? ((((sub['items'] as Record<string, unknown>)?.['data'] as Record<string, unknown>[])?.[0]?.['price']) as Record<string, unknown>)?.['id'] as string | undefined
          : undefined

        await supabase.from('subscriptions')
          .update({
            status: status === 'active' ? 'active' : status === 'past_due' ? 'past_due' : status,
            cancel_at_period_end: cancelAtPeriodEnd,
            current_period_end: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : undefined,
            ...(priceId ? { plan: priceId } : {}),
          })
          .eq('stripe_subscription_id', sub['id'] as string)

        // Sync user tier based on subscription status
        const { data: subscription } = await supabase.from('subscriptions')
          .select('user_id').eq('stripe_subscription_id', sub['id'] as string).single()
        if (subscription) {
          const tier = status === 'active' ? 'premium' : 'free'
          await supabase.from('users').update({ subscription_tier: tier }).eq('id', subscription.user_id)
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = invoice['subscription'] as string | null
        if (subscriptionId) {
          await supabase.from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId)

          const { data: subscription } = await supabase.from('subscriptions')
            .select('user_id').eq('stripe_subscription_id', subscriptionId).single()
          if (subscription) {
            await supabase.from('users')
              .update({ subscription_tier: 'premium' })
              .eq('id', subscription.user_id)
          }
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', invoice['customer'] as string)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-webhook] Error:', err)
    return new Response('Internal server error', { status: 500 })
  }
})
