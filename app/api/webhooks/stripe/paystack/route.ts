import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import Order from '@/lib/db/models/order.model'
import { sendPurchaseReceipt } from '@/emails'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const paystackSignature = req.headers.get('x-paystack-signature') || ''

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
    .update(rawBody)
    .digest('hex')

  // 🔒 Reject if signature is invalid
  if (expectedSignature !== paystackSignature) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)

  // ✅ Handle charge.success
  if (event.event === 'charge.success') {
    const data = event.data
    const orderId = data.metadata?.orderId
    const email = data.customer?.email
    const pricePaid = (data.amount / 100).toFixed(2)

    const order = await Order.findById(orderId).populate('user', 'email')
    if (!order) {
      return new NextResponse('Order not found', { status: 404 })
    }

    // ✅ Update order to paid
    order.isPaid = true
    order.paidAt = new Date()
    order.paymentResult = {
      id: data.reference,
      status: data.status,
      email_address: email,
      pricePaid,
    }

    await order.save()

    try {
      await sendPurchaseReceipt({ order })
    } catch (err) {
      console.error('❌ Failed to send email receipt:', err)
    }

    return NextResponse.json({ message: 'Order updated to paid' })
  }

  // ✅ Ignore other events safely
  return NextResponse.json({ received: true })
}
