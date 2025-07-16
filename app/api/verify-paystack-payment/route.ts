import { NextRequest, NextResponse } from 'next/server'
import Order from '@/lib/db/models/order.model'
import { sendPurchaseReceipt } from '@/emails'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ isSuccess: false, error: 'No reference provided' }, { status: 400 })
  }

  try {
    // 1. Verify the transaction with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await res.json()
    const data = result.data

    if (!data || data.status !== 'success') {
      return NextResponse.json({ isSuccess: false, error: 'Verification failed' }, { status: 400 })
    }

    const orderId = data.metadata?.orderId
    const email = data.customer?.email
    const pricePaid = (data.amount / 100).toFixed(2)

    // 2. Look up the order in your database
    const order = await Order.findById(orderId).populate('user', 'email')
    if (!order) {
      return NextResponse.json({ isSuccess: false, error: 'Order not found' }, { status: 404 })
    }

    // 3. If not already marked as paid, mark it
    if (!order.isPaid) {
      order.isPaid = true
      order.paidAt = new Date()
      order.paymentResult = {
        id: reference,
        status: data.status,
        email_address: email,
        pricePaid,
      }
      await order.save()

      // 4. Send confirmation email
      try {
        await sendPurchaseReceipt({ order })
      } catch (err) {
        console.error('Email error:', err)
      }
    }

    return NextResponse.json({ isSuccess: true, order })
  } catch (err) {
    console.error('Paystack verification error:', err)
    return NextResponse.json({ isSuccess: false, error: 'Server error' }, { status: 500 })
  }
}
