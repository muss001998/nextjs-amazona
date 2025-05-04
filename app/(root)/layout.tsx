import React from 'react'
import { Toaster } from 'sonner' // adjust path if needed

import Header from '@/components/shared/header'
import Footer from '@/components/shared/footer'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col min-h-screen'>
      <Header />
      <main className='flex-1 flex flex-col p-4'>{children}</main>
      <Footer />
      <Toaster /> {/* 👈 This enables toast notifications globally */}
    </div>
  )
}
