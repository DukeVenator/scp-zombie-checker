import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import './styles/theme.css'
import 'sonner/dist/styles.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AgentProfileProvider } from './lib/agent-profile'
import { PatientStoreProvider } from './lib/patients-context'
import { ToastProvider } from './lib/toast-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary section="SCP Zombie Checker (root)">
      <HashRouter>
        <ToastProvider>
          <AgentProfileProvider>
            <PatientStoreProvider>
              <App />
            </PatientStoreProvider>
          </AgentProfileProvider>
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
