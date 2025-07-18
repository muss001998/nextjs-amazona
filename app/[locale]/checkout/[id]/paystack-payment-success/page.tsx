import Link from 'next/link';
import { redirect } from 'next/navigation';
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
  const searchParams = await props.searchParams;

  const { id, locale } = params;
  const reference = searchParams.reference;

  if (!reference) {
    console.warn("⚠️ No reference provided in search params. Redirecting to checkout.");
    return redirect(`/${locale}/checkout/${id}?error=${encodeURIComponent("No payment reference provided.")}`);
  }

  // Retry logic to handle potential timing issues
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/verify-paystack-payment?reference=${reference}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        console.error("Payment verification API failed:", res.status, res.statusText);
        return redirect(`/${locale}/checkout/${id}?error=${encodeURIComponent("Payment verification failed. Please try again.")}`);
      }

      const data = await res.json();

      // More robust isSuccess check
      const isSuccess =
        data.isSuccess === true &&
        data.order &&
        data.order._id &&
        typeof data.order._id === 'string' && // Check if _id exists and is a string
        data.order._id === id &&
        data.order.isPaid === true;

      if (isSuccess) {
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
      } else {
        console.warn("⚠️ Payment verification failed (isSuccess is false). Retrying...");
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retrying
      }
    } catch (error) {
      console.error("Error during payment verification:", error);
      return redirect(`/${locale}/checkout/${id}?error=${encodeURIComponent("An unexpected error occurred during payment verification.")}`);
    }
  }

  // If all retries fail, redirect to checkout with an error message
  console.error("Payment verification failed after multiple retries. Redirecting to checkout.");
  return redirect(`/${locale}/checkout/${id}?error=${encodeURIComponent("Payment verification failed after multiple attempts. Please contact support.")}`);
};

export default PaystackSuccessPage;