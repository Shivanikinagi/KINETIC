import { Routes, Route, Navigate } from 'react-router-dom'
import { WalletProvider } from './hooks/useWallet'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Hub from './pages/Hub'
import Explore from './pages/Explore'
import SubmitJob from './pages/SubmitJob'
import MyJobs from './pages/MyJobs'
import Dashboard from './pages/Dashboard'
import Provide from './pages/Provide'
import Activity from './pages/Activity'
import Monitor from './pages/Monitor'
import Wallet from './pages/Wallet'

export default function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/submit" element={<SubmitJob />} />
            <Route path="/jobs" element={<MyJobs />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/provide" element={<Provide />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </WalletProvider>
  )
}
