import React from 'react'
import type { AppProps } from 'next/app'
import '../styles/globals.css'
import ToastProvider from '../components/Toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <ToastProvider />
    </>
  )
}
