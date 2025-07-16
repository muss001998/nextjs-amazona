import { notFound } from 'next/navigation'
import React from 'react'
import { auth } from '@/auth'
import { getOrderById } from '@/lib/actions/order.actions'
import PaymentForm from './payment-form'
import Stripe from 'stripe'
import { getSetting } from '@/lib/actions/setting.actions'
import { cookies } from 'next/headers'
import type { SiteCurrency } from '@/types'


export const metadata = {
  title: 'Payment',
}

const CheckoutPaymentPage = async (props: {
  params: Promise<{ id: string }>
}) => {
  const params = await props.params
  const { id } = params

  const order = await getOrderById(id)
  if (!order) notFound()

  const session = await auth()

  // ✅ Get setting and currency from cookie
  const setting = await getSetting()
  const cookieStore = await cookies()
  const currencyCookie = cookieStore.get('currency')?.value

  const currency: SiteCurrency =
  setting.availableCurrencies.find((cur) => cur.code === currencyCookie) ??
  setting.availableCurrencies.find((cur) => cur.code === setting.defaultCurrency.code)!


  if (!currency) {
    throw new Error('No matching currency found')
  }

  // ✅ Generate Stripe payment intent only if needed
  let client_secret = null
  if (order.paymentMethod === 'Stripe' && !order.isPaid) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100),
      currency: currency.code.toLowerCase(), // use user's currency
      metadata: { orderId: order._id },
    })
    client_secret = paymentIntent.client_secret
  }

  return (
    <PaymentForm
      order={order}
      paypalClientId={process.env.PAYPAL_CLIENT_ID || 'sb'}
      clientSecret={client_secret}
      isAdmin={session?.user?.role === 'Admin' || false}
      currency={currency}
    />
  )
}

export default CheckoutPaymentPage
