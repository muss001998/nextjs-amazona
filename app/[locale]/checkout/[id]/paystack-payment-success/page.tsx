import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: {
    locale: string;
    id: string;
  };
  searchParams: {
    reference?: string;
  };
}

const PaystackSuccessPage = async ({ params, searchParams }: PageProps) => {
  const { id, locale } = params;
  const reference = searchParams.reference;

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
      notFound();
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
