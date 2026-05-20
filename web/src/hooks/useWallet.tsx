import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { PeraWalletConnect } from '@perawallet/connect'

interface WalletContextType {
  address: string | null
  connected: boolean
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [peraWallet] = useState(() => new PeraWalletConnect({ chainId: 416002 }))

  // Reconnect on mount
  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setConnected(true)
      }
    }).catch(() => {
      // no previous session
    })

    const handleDisconnect = () => {
      setAddress(null)
      setConnected(false)
    }

    peraWallet.connector?.on('disconnect', handleDisconnect)
    return () => {
      // cleanup handled by PeraWallet internally
    }
  }, [peraWallet])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const accounts = await peraWallet.connect()
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setConnected(true)
      }
    } catch (err: any) {
      console.error('Wallet connect error:', err)
      throw err
    } finally {
      setConnecting(false)
    }
  }, [peraWallet])

  const disconnect = useCallback(async () => {
    try {
      await peraWallet.disconnect()
    } catch (e) {
      console.log('Disconnect error:', e)
    }
    setAddress(null)
    setConnected(false)
  }, [peraWallet])

  return (
    <WalletContext.Provider value={{ address, connected, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
