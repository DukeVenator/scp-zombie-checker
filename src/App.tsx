import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AgentOnboarding } from './components/onboarding/AgentOnboarding'
import { PwaUpdateHandler } from './components/PwaUpdateHandler'
import { StartupAnimation } from './components/StartupAnimation'
import { WelcomeBackUnlock } from './components/WelcomeBackUnlock'
import { ErrorBoundary } from './components/ErrorBoundary'

const AppShell = lazy(() => import('./components/layout/AppShell').then((module) => ({ default: module.AppShell })))
const BadgePage = lazy(() => import('./pages/BadgePage').then((module) => ({ default: module.BadgePage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const NewPatientPage = lazy(() => import('./pages/NewPatientPage').then((module) => ({ default: module.NewPatientPage })))
const PatientDetailPage = lazy(() =>
  import('./pages/PatientDetailPage').then((module) => ({ default: module.PatientDetailPage })),
)
const ImportExportPage = lazy(() =>
  import('./pages/ImportExportPage').then((module) => ({ default: module.ImportExportPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const TestingPrintsPage = lazy(() =>
  import('./pages/TestingPrintsPage').then((module) => ({ default: module.TestingPrintsPage })),
)

function App() {
  return (
    <ErrorBoundary section="SCP Zombie Checker">
      <Suspense fallback={<div className="panel">Loading interface...</div>}>
        <>
          <PwaUpdateHandler />
          <StartupAnimation />
          <WelcomeBackUnlock />
          <Routes>
            <Route
              path="/badge"
              element={
                <ErrorBoundary section="Patient check">
                  <BadgePage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/testing/prints"
              element={
                <ErrorBoundary section="Print testing">
                  <TestingPrintsPage />
                </ErrorBoundary>
              }
            />
            <Route element={<AppShell />} path="/">
              <Route
                element={
                  <ErrorBoundary section="Dashboard">
                    <DashboardPage />
                  </ErrorBoundary>
                }
                index
              />
              <Route
                element={
                  <ErrorBoundary section="New patient intake">
                    <NewPatientPage />
                  </ErrorBoundary>
                }
                path="new"
              />
              <Route
                element={
                  <ErrorBoundary section="Patient detail">
                    <PatientDetailPage />
                  </ErrorBoundary>
                }
                path="patients/:id"
              />
              <Route
                element={
                  <ErrorBoundary section="Import / Export">
                    <ImportExportPage />
                  </ErrorBoundary>
                }
                path="transfers"
              />
              <Route
                element={
                  <ErrorBoundary section="Settings">
                    <SettingsPage />
                  </ErrorBoundary>
                }
                path="settings"
              />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Route>
          </Routes>
          <AgentOnboarding />
          <Toaster position="top-right" richColors theme="dark" />
        </>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
