import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PageParams {
  locale: string;
  id: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<{ reference?: string }>;
}

const PaystackSuccessPage = async (props: PageProps) => {
  const params = await props.params;
  const { id, locale } = params;

  const searchParams = await props.searchParams;
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
      //  Added notFound() here
      notFound();
      //return redirect(`/${locale}/checkout/${id}`);
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