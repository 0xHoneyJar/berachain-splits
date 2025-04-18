'use client'

import { useMemo, useState } from 'react'

import { gql, useQuery } from '@apollo/client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { CreateSplit, useSplitsClient } from '@zksoju/splits-kit'
import { AddressInput } from '@zksoju/splits-kit/inputs'
import Link from 'next/link'
import {
  Control,
  useForm,
  UseFormSetError,
  UseFormSetValue,
} from 'react-hook-form'
import {
  Chain,
  createPublicClient,
  http,
  isAddress,
  PublicClient,
  Transport,
  zeroAddress,
} from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

import LoadingIndicator from '~/components/LoadingIndicator'
import { Tabs, TabsContent } from '~/components/ui/tabs'
import { RPC_URLS_MAP } from '~/constants/chains'

const contractAddresses = {
  'PullSplitFactoryV2.1': '0x09d053beA2fc4F3999Ff90b6F6d32314a9965115',
  'PushSplitFactoryV2.1': '0x65B682D297C09f21B106EBb16666124431fB178D',
  SplitsWarehouse: '0xadfC58C804072F41D5fCd296F19B8874B021Ea2C',
}

// --- Update GraphQL Query ---
const GET_SPLIT_RECIPIENTS = gql`
  # Use the query structure provided by the user
  query MyQuery($id: String!) {
    # Renamed from GetSplitRecipients to MyQuery
    splitById(id: $id) {
      # Changed root field to splitById
      id
      creator # Added creator field as per user query
      recipients {
        address
        allocation # Changed field name from percentAllocation to allocation
      }
    }
  }
`
// --- End GraphQL Query Definition ---

export default function Home() {
  const { address, isConnecting } = useAccount()

  if (isConnecting) return <LoadingIndicator />

  return (
    <div className="space-y-8 p-4">
      <div className="flex items-end justify-end">
        <ConnectButton showBalance={false} chainStatus={'icon'} />
      </div>
      <div className="items-center justify-items-center pb-16">
        {address ? <ConnectedPage /> : <LandingPage />}
      </div>
    </div>
  )
}

const ExternalLink = ({ url, text }: { url: string; text: string }) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded border border-yellow-700 bg-yellow-900 px-3 py-1 text-center hover:bg-yellow-800 md:text-left"
    >
      {text}
    </a>
  )
}

const LandingPage = () => {
  return (
    <div className="max-w-prose space-y-4">
      <div className="text-4xl">
        Splits Lite on <span className="text-yellow-500">Berachain</span>
      </div>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        A minimal app for creating and distributing Splits on Berachain. Connect
        your wallet to continue.
      </p>
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <ExternalLink
          url="https://github.com/0xSplits/splits-lite/tree/main"
          text="View on Github"
        />
        {/* <ExternalLink
          url="https://github.com/0xSplits/splits-lite/blob/main/src/constants/chains.ts"
          text="Supported chains"
        /> */}
        <ExternalLink
          url="https://github.com/0xSplits/splits-lite/blob/main/src/constants/erc20.ts"
          text="Supported tokens"
        />
      </div>
      <div className="w-full pt-8">
        <h3 className="mb-8 text-xl">Deployed Contracts</h3>
        <ul className="w-full space-y-4">
          {Object.entries(contractAddresses).map(([name, address]) => (
            <div
              key={name}
              className="flex w-full items-center justify-between gap-2"
            >
              <span className="text-gray-400">{name}</span>
              <a
                href={`https://berascan.com/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-white/10 px-3 py-1 text-center font-mono text-xs text-gray-400 hover:bg-white/10 md:text-left"
              >
                {address}
              </a>
            </div>
          ))}
        </ul>
      </div>
    </div>
  )
}

type SearchSplitForm = {
  address: string
}

const ConnectedPage = () => {
  const { chain, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [tab, setTab] = useState('create')
  const onTabChange = (value: string) => {
    setTab(value)
  }

  const { control, watch, setValue, setError } = useForm<SearchSplitForm>({
    mode: 'onChange',
    defaultValues: {
      address: '',
    },
  })
  const searchSplitAddress = watch('address')

  const defaultPublicClients = useMemo(() => {
    return Object.entries(RPC_URLS_MAP).reduce(
      (acc, [chainId, rpcData]) => {
        const key = Number(chainId)
        acc[key] = createPublicClient({
          chain: rpcData.chain,
          transport: http(rpcData.url),
        }) as PublicClient<Transport, Chain>
        return acc
      },
      {} as { [chainId: number]: PublicClient<Transport, Chain> },
    )
  }, [])

  useSplitsClient({
    chainId: chainId ?? 1,
    publicClient,
    walletClient,
    publicClients: defaultPublicClients,
  })

  if (!chain || !chainId) return <UnsupportedNetwork />

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={onTabChange}
        defaultValue="create"
        options={[
          { value: 'create', display: 'Create' },
          { value: 'search', display: 'Search' },
        ]}
      >
        <TabsContent value="create">
          <CreateSplit
            chainId={chainId}
            type={'v2Push'}
            defaultDistributorFee={0}
            defaultOwner={zeroAddress}
            defaultDistributorFeeOptions={[]}
            linkToApp={false}
            supportsEns={false}
            width={'xl'}
            onSuccess={({ address }) => {
              // TODO: delay first?
              setValue('address', address)
              setTab('search')
            }}
            displayChain={false}
          />
        </TabsContent>
        <TabsContent value="search">
          <SearchSplit
            splitAddress={searchSplitAddress}
            control={control}
            setValue={setValue}
            setError={setError}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}

const SearchSplit = ({
  splitAddress,
  control,
  setValue,
  setError,
}: {
  splitAddress: string
  control: Control<SearchSplitForm>
  setValue: UseFormSetValue<SearchSplitForm>
  setError: UseFormSetError<SearchSplitForm>
}) => {
  const { chain } = useAccount()

  const isAddressValid = (address: string) => {
    if (!address) return 'Required'
    return isAddress(address) || 'Invalid address'
  }

  const { loading, error, data } = useQuery(GET_SPLIT_RECIPIENTS, {
    variables: { id: splitAddress.toLowerCase() },
    skip: !isAddress(splitAddress),
  })

  // --- Update data extraction to match new query structure ---
  // Assumes allocation is Parts Per Million (e.g., 500000 = 50%)
  // !!! Confirm allocation format if this assumption is wrong !!!
  const recipients =
    data?.splitById?.recipients?.map(
      (r: { address: string; allocation: number }) => ({
        address: r.address,
        // Convert allocation (ppm) to percentage
        percentAllocation: r.allocation / 10000,
      }),
    ) || []
  const splitExists = !!data?.splitById // Check if splitById object exists
  const fetchError = error
    ? error.message
    : !loading && isAddress(splitAddress) && !splitExists
      ? 'Split not found.'
      : null
  // --- End data extraction ---

  return (
    <form style={{ width: '36rem' }}>
      <div className="flex flex-col space-y-4">
        <div className="w-full space-y-2">
          <label>Split address on {chain?.name}</label>
          <AddressInput
            control={control}
            inputName={'address'}
            placeholder={'0x...'}
            setValue={setValue}
            setError={setError}
            validationFunc={isAddressValid}
            autoFocus={true}
            supportsEns={false}
          />
        </div>

        {/* --- Display Logic (no change needed here, uses percentAllocation) --- */}
        {loading && (
          <div className="flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 p-4 text-gray-400">
            <span className="ml-2">Loading recipients...</span>
          </div>
        )}
        {fetchError && (
          <div className="rounded-md border border-red-700 bg-red-900/30 p-4 text-center text-red-400">
            Error: {fetchError}
          </div>
        )}
        {!loading &&
          !fetchError &&
          isAddress(splitAddress) &&
          recipients.length > 0 && (
            <div className="rounded-md border border-neutral-700 bg-neutral-800">
              <div className="flex items-center justify-between border-b border-neutral-700 p-4">
                <span className="font-medium text-gray-300">Recipients</span>
                <span className="font-medium text-gray-300">Share</span>
              </div>
              <div className="space-y-2 p-4">
                {/* Map over recipients, uses percentAllocation calculated above */}
                {recipients.map(
                  (
                    recipient: { address: string; percentAllocation: number },
                    index: number,
                  ) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono text-sm text-gray-400">
                        {recipient.address.slice(0, 6)}...
                        {recipient.address.slice(-4)}
                      </span>
                      <span className="text-sm text-gray-300">
                        {/* Display the calculated percentage */}
                        {recipient.percentAllocation.toFixed(2)}%
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        {/* Optional: Add message if split exists but has no recipients */}
        {!loading &&
          !fetchError &&
          isAddress(splitAddress) &&
          recipients.length === 0 &&
          splitExists && (
            <div className="rounded-md border border-neutral-700 bg-neutral-800 p-4 text-center text-gray-400">
              Split found, but it has no recipients.
            </div>
          )}
      </div>
    </form>
  )
}

const UnsupportedNetwork = () => {
  return (
    <div className="flex flex-col items-center space-y-4 sm:items-start">
      <div className="text-xl">This chain isn&apos;t supported.</div>
      <div className="text-md">
        <Link
          href="https://docs.splits.org"
          target="_blank"
          className="text-blue-400 underline hover:text-blue-700"
        >
          Here
        </Link>{' '}
        is a list of supported chains
      </div>
      <div className="text-md">
        Email us at support@splits.org to request support for a new chain.
      </div>
    </div>
  )
}
