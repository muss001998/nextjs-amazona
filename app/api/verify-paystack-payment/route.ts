import { NextRequest, NextResponse } from 'next/server'
import Order from '@/lib/db/models/order.model'
import { sendPurchaseReceipt } from '@/emails'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    console.warn("⚠️ No reference provided in the URL.");
    return NextResponse.json(
      { isSuccess: false, error: 'No reference provided' },
      { status: 400 }
    );
  }

  try {
    // 1. Verify the transaction with Paystack
    const paystackUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    console.log('🔍 Verifying Paystack reference:', reference);

    const res = await fetch(paystackUrl, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Paystack API call failed. Status: ${res.status}`, errorText);
      console.error("❌ Paystack API error details:", errorText);
      return NextResponse.json(
        { isSuccess: false, error: 'Paystack verification API failed' },
        { status: res.status }
      );
    }

    let result;
    try {
      result = await res.json();
    } catch (jsonErr) {
      console.error('❌ Failed to parse JSON from Paystack response:', jsonErr);
      return NextResponse.json({ isSuccess: false, error: 'Invalid JSON from Paystack' }, { status: 500 });
    }

    const data = result.data;
    console.log('✅ Paystack response data:', data);

    if (!data || data.status !== 'success') {
      console.warn("⚠️ Paystack verification failed. Data:", data);
      return NextResponse.json({ isSuccess: false, error: 'Verification failed' }, { status: 400 });
    }

    const orderId = data.metadata?.orderId;
    const email = data.customer?.email;
    const pricePaid = (data.amount / 100).toFixed(2);

    // 2. Look up the order in your database
    const order = await Order.findById(orderId).populate('user', 'email');
    if (!order) {
      console.error('❌ Order not found for orderId:', orderId);
      return NextResponse.json({ isSuccess: false, error: 'Order not found' }, { status: 404 });
    }

    // 3. If not already marked as paid, mark it
    if (!order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        id: reference,
        status: data.status,
        email_address: email,
        pricePaid,
      };
      await order.save();

      // 4. Send confirmation email
      try {
        await sendPurchaseReceipt({ order });
      } catch (err) {
        console.error('❌ Email error:', err);
      }
    }

    // IMPORTANT:  Redirect the user to the success page!
    console.log("✅ Payment verification successful.  Redirecting to success page");
    return NextResponse.redirect(`/checkout/${orderId}/paystack-payment-success?reference=${encodeURIComponent(reference)}`);

  } catch (err) {
    console.error('❌ Paystack verification unexpected error:', err);
    return NextResponse.json({ isSuccess: false, error: 'Server error' }, { status: 500 });
  }
}