import { Geist, Geist_Mono } from 'next/font/google'
import '../globals.css'
import ClientProviders from '@/components/shared/client-providers'
import { getDirection } from '@/i18n-config'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { getSetting } from '@/lib/actions/setting.actions'
import { cookies } from 'next/headers'
import { CurrencyProvider } from '@/context/currency-context'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata() {
  const {
    site: { slogan, name, description, url },
  } = await getSetting()
  return {
    title: {
      template: `%s | ${name}`,
      default: `${name}. ${slogan}`,
    },
    description: description,
    metadataBase: new URL(url),
  }
}

// ✅ Use `params: Promise<{ locale: string }>`
export default async function AppLayout({
  params: paramsPromise,
  children,
}: {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}) {
  // ✅ Await the params
  const { locale } = await paramsPromise

  if (!routing.locales.includes(locale)) {
    notFound()
  }

  const setting = await getSetting()

  const cookieStore = await cookies() // Await the cookies() function
  const currencyCookie = cookieStore.get('currency')?.value

  const currency =
    setting.availableCurrencies.find((cur) => cur.code === currencyCookie) ??
    setting.availableCurrencies.find(
      (cur) => cur.code === setting.defaultCurrency.code
    )

  if (!currency) {
    throw new Error('No matching currency found')
  }

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      dir={getDirection(locale) === 'rtl' ? 'rtl' : 'ltr'}
      suppressHydrationWarning
    >
      <body
        className={`min-h-screen ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CurrencyProvider defaultCurrency={currency}>
            <ClientProviders setting={{ ...setting, currency }}>
              {children}
            </ClientProviders>
          </CurrencyProvider>
        </NextIntlClientProvider>

        <script
          type="text/javascript"
          src="https://js.paystack.co/v1/inline.js"
          async
        ></script>
      </body>
    </html>
  )
}