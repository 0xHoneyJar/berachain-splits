'use client'

import '@rainbow-me/rainbowkit/styles.css'

import { ReactNode, Suspense } from 'react'

import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SplitsProvider } from '@zksoju/splits-kit'

import LoadingIndicator from '~/components/LoadingIndicator'
import {
  RainbowProvider,
  WagmiProviderWrapper,
} from '~/context/externalContext'

import '@zksoju/splits-kit/styles.css'

const queryClient = new QueryClient()

const client = new ApolloClient({
  uri: 'https://the-honey-jar.squids.live/splits-squid@v1/api/graphql',
  cache: new InMemoryCache(),
})

export default function App({
  children,
}: {
  children: ReactNode
}): JSX.Element {
  return (
    <>
      <ApolloProvider client={client}>
        <QueryClientProvider client={queryClient}>
          <WagmiProviderWrapper>
            <RainbowProvider>
              <SplitsProvider>
                <AppContainer>{children}</AppContainer>
              </SplitsProvider>
            </RainbowProvider>
          </WagmiProviderWrapper>
        </QueryClientProvider>
      </ApolloProvider>
    </>
  )
}

const AppContainer = ({ children }: { children: ReactNode }): JSX.Element => {
  return <Suspense fallback={<LoadingIndicator />}>{children}</Suspense>
}
