import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { WalletProvider } from './hooks/useWallet'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import DashboardLayout from './components/DashboardLayout'

// Eager load Hub for fast initial paint
import Hub from './pages/Hub'

// Lazy load all other pages for code splitting
const Explore = lazy(() => import('./pages/Explore'))
const SubmitJob = lazy(() => import('./pages/SubmitJob'))
const MyJobs = lazy(() => import('./pages/MyJobs'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Provide = lazy(() => import('./pages/Provide'))
const Activity = lazy(() => import('./pages/Activity'))
const Monitor = lazy(() => import('./pages/Monitor'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Models = lazy(() => import('./pages/Models'))
const Datasets = lazy(() => import('./pages/Datasets'))
const Spaces = lazy(() => import('./pages/Spaces'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const Assistant = lazy(() => import('./pages/Assistant'))
const JobExecution = lazy(() => import('./pages/JobExecution'))
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'))

// Lazy load space demos
const ChatSpace = lazy(() => import('./pages/spaces/ChatSpace'))
const ImageGenSpace = lazy(() => import('./pages/spaces/ImageGenSpace'))
const AudioSpace = lazy(() => import('./pages/spaces/AudioSpace'))
const VisionSpace = lazy(() => import('./pages/spaces/VisionSpace'))
const SummarizeSpace = lazy(() => import('./pages/spaces/SummarizeSpace'))
const SentimentSpace = lazy(() => import('./pages/spaces/SentimentSpace'))
const TranslateSpace = lazy(() => import('./pages/spaces/TranslateSpace'))
const CodeGenSpace = lazy(() => import('./pages/spaces/CodeGenSpace'))
const NERSpace = lazy(() => import('./pages/spaces/NERSpace'))
const TTSSpace = lazy(() => import('./pages/spaces/TTSSpace'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}

export default function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Hub />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/submit" element={<SubmitJob />} />
              <Route path="/models" element={<Models />} />
              <Route path="/datasets" element={<Datasets />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/spaces/chat" element={<ChatSpace />} />
              <Route path="/spaces/image-gen" element={<ImageGenSpace />} />
              <Route path="/spaces/audio" element={<AudioSpace />} />
              <Route path="/spaces/vision" element={<VisionSpace />} />
              <Route path="/spaces/summarize" element={<SummarizeSpace />} />
              <Route path="/spaces/sentiment" element={<SentimentSpace />} />
              <Route path="/spaces/translate" element={<TranslateSpace />} />
              <Route path="/spaces/code" element={<CodeGenSpace />} />
              <Route path="/spaces/ner" element={<NERSpace />} />
              <Route path="/spaces/tts" element={<TTSSpace />} />
              <Route path="/job/:jobId" element={<JobExecution />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/agent" element={<AgentDashboard />} />
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
          </Suspense>
        </main>
        <Footer />
      </div>
    </WalletProvider>
  )
}
