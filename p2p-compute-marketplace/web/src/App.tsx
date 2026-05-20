import { Routes, Route, Navigate } from 'react-router-dom'
import { WalletProvider } from './hooks/useWallet'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import DashboardLayout from './components/DashboardLayout'
import Hub from './pages/Hub'
import Explore from './pages/Explore'
import SubmitJob from './pages/SubmitJob'
import MyJobs from './pages/MyJobs'
import Dashboard from './pages/Dashboard'
import Provide from './pages/Provide'
import Activity from './pages/Activity'
import Monitor from './pages/Monitor'
import Wallet from './pages/Wallet'
import Models from './pages/Models'
import Datasets from './pages/Datasets'
import Spaces from './pages/Spaces'
import ApiKeys from './pages/ApiKeys'
import Assistant from './pages/Assistant'

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}

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
            <Route path="/models" element={<Models />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/spaces" element={<Spaces />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/wallet" element={<Wallet />} />
            
            {/* Dashboard pages with sidebar */}
            <Route path="/dashboard" element={<DashboardWrapper><Dashboard /></DashboardWrapper>} />
            <Route path="/monitor" element={<DashboardWrapper><Monitor /></DashboardWrapper>} />
            <Route path="/jobs" element={<DashboardWrapper><MyJobs /></DashboardWrapper>} />
            <Route path="/activity" element={<DashboardWrapper><Activity /></DashboardWrapper>} />
            <Route path="/api" element={<DashboardWrapper><ApiKeys /></DashboardWrapper>} />
            <Route path="/provide" element={<DashboardWrapper><Provide /></DashboardWrapper>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </WalletProvider>
  )
}
