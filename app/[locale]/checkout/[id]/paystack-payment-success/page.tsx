import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { NextPage } from 'next';
import { NextRequest, NextResponse } from 'next/server';

interface PageProps {
  params: {
    locale: string;
    id: string;
  };
  searchParams: {
    reference?: string;
  };
  request: NextRequest; // Add NextRequest
  response: NextResponse; // Add NextResponse
}

const PaystackSuccessPage: NextPage<PageProps> = async ({ params, searchParams, request, response }) => { // Add request and response
  const { id, locale } = params;
  const { reference } = searchParams;

  console.log("Request:", request); // Use the request variable
  console.log("Response:", response); // Use the response variable

  if (!reference) {
    return redirect(`/${locale}/checkout/${id}`);
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/verify-paystack-payment?reference=${reference}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.error("Payment verification API failed:", res.status, res.statusText);
      return redirect(`/${locale}/checkout/${id}`);
    }

    const data = await res.json();
    const isSuccess =
      data.isSuccess === true && data.order && data.order._id === id;

    if (!isSuccess) {
      return redirect(`/${locale}/checkout/${id}`);
    }

    return (
      <div className='max-w-4xl w-full mx-auto space-y-8'>
        <div className='flex flex-col gap-6 items-center '>
          <h1 className='font-bold text-2xl lg:text-3xl'>
            Thanks for your purchase
          </h1>
          <div>We are now processing your order.</div>
          <Button asChild>
            <Link href={`/account/orders/${id}`}>View order</Link>
          </Button>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error during payment verification:", error);
    return redirect(`/${locale}/checkout/${id}`);
  }
};

export default PaystackSuccessPage;