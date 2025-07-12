'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { SiteCurrency } from '@/types'

type CurrencyContextType = {
  currency: SiteCurrency
  setCurrency: (currency: SiteCurrency) => void
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used inside CurrencyProvider')
  }
  return context
}

export const CurrencyProvider = ({
  defaultCurrency,
  children,
}: {
  defaultCurrency: SiteCurrency
  children: React.ReactNode
}) => {
  const [currency, setCurrencyState] = useState<SiteCurrency>(defaultCurrency)

  useEffect(() => {
    const stored = localStorage.getItem('currency')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.code && parsed?.convertRate) {
          setCurrencyState(parsed)
        }
      } catch (e) {
        console.error('Invalid currency in localStorage')
      }
    }
  }, [])

  const setCurrency = (newCurrency: SiteCurrency) => {
    localStorage.setItem('currency', JSON.stringify(newCurrency))
    setCurrencyState(newCurrency)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}
