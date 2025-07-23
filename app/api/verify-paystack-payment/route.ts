import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/db/models/order.model';
import { sendPurchaseReceipt } from '@/emails';
import '@/lib/db/models/user.model'; // 👈 this registers the User schema

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    console.warn("⚠️ No reference provided in the URL.");
    return NextResponse.json(
      { isSuccess: false, error: 'No reference provided in the URL.', details: null, order: null },
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
      let errorDetails: unknown = null;
      try {
        errorDetails = await res.json();
      } catch {
        errorDetails = await res.text();
      }
      console.error(`❌ Paystack API call failed. Status: ${res.status}`, errorDetails);
      return NextResponse.json(
        { isSuccess: false, error: 'Paystack verification API failed', details: errorDetails, order: null },
        { status: res.status }
      );
    }

    let result: unknown;
    try {
      result = await res.json();
    } catch (jsonErr) {
      console.error('❌ Failed to parse JSON from Paystack response:', jsonErr);
      return NextResponse.json(
        { isSuccess: false, error: 'Invalid JSON from Paystack', details: jsonErr, order: null },
        { status: 500 }
      );
    }

    // Type guard for result
    if (
      typeof result !== 'object' ||
      result === null ||
      !('data' in result)
    ) {
      console.error('❌ Invalid Paystack response structure:', result);
      return NextResponse.json(
        { isSuccess: false, error: 'Invalid Paystack API response', details: result, order: null },
        { status: 500 }
      );
    }

    // Now result is an object with 'data'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (result as { data: any }).data;
    console.log('✅ Paystack response data:', data);

    // Check success status from Paystack
    if (!data || data.status !== 'success') {
      console.warn("⚠️ Paystack verification failed. Data:", data);
      return NextResponse.json(
        { isSuccess: false, error: 'Verification failed', details: data, order: null },
        { status: 400 }
      );
    }

    const orderId = data.metadata?.orderId;
    const email = data.customer?.email;
    const pricePaid = (data.amount / 100).toFixed(2);

    if (!orderId) {
      console.error('❌ No orderId in Paystack metadata.', { data });
      return NextResponse.json(
        { isSuccess: false, error: 'No orderId in Paystack metadata', details: data, order: null },
        { status: 400 }
      );
    }

    // 2. Look up the order in your database
    const order = await Order.findById(orderId).populate('user', 'email');
    if (!order) {
      console.error('❌ Order not found for orderId:', orderId);
      return NextResponse.json(
        { isSuccess: false, error: 'Order not found', details: { orderId }, order: null },
        { status: 404 }
      );
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
      try {
        await order.save();
      } catch (err: unknown) {
        console.error('❌ Failed to save order after payment:', err);
        return NextResponse.json(
          { isSuccess: false, error: 'Failed to mark order as paid', details: err, order: null },
          { status: 500 }
        );
      }

      // 4. Send confirmation email
      try {
        await sendPurchaseReceipt({ order });
      } catch (err) {
        console.error('❌ Email error:', err);
        // Don’t fail the request for email failure, just log it
      }
    }

    // 5. Success: return order and redirect
    const redirectUrl = `/checkout/${orderId}/paystack-payment-success?reference=${reference}`;
    return NextResponse.json({
      isSuccess: true,
      message: "Payment verification successful.",
      redirectUrl,
      order: {
        _id: order._id.toString(),
        isPaid: order.isPaid,
        // Add extra fields if needed
      },
    });

  } catch (err: unknown) {
    console.error('❌ Paystack verification unexpected error:', err);
    return NextResponse.json(
      { isSuccess: false, error: 'Server error', details: err, order: null },
      { status: 500 }
    );
  }
}