import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TestingPrintsPage } from './TestingPrintsPage'

const renderTestingPrints = () => {
  render(
    <MemoryRouter initialEntries={['/testing/prints']}>
      <Routes>
        <Route path="/testing/prints" element={<TestingPrintsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TestingPrintsPage', () => {
  it('renders all dossier variants by severity', () => {
    renderTestingPrints()

    expect(screen.getByTestId('print-variant-dossier-cleared')).toBeInTheDocument()
    expect(screen.getByTestId('print-variant-dossier-warning')).toBeInTheDocument()
    expect(screen.getByTestId('print-variant-dossier-critical')).toBeInTheDocument()
  })

  it('renders all badge variants by severity', () => {
    renderTestingPrints()

    expect(screen.getByTestId('print-variant-badge-cleared')).toBeInTheDocument()
    expect(screen.getByTestId('print-variant-badge-warning')).toBeInTheDocument()
    expect(screen.getByTestId('print-variant-badge-critical')).toBeInTheDocument()
  })

  it('shows SCP dossier structure and CONFIDENTIAL in dossier sections', () => {
    renderTestingPrints()

    const clearedCard = screen.getByTestId('print-variant-dossier-cleared')
    expect(clearedCard).toHaveTextContent('Secure. Contain. Protect.')
    expect(clearedCard).toHaveTextContent('CONFIDENTIAL!')
    expect(clearedCard).toHaveTextContent('Special Containment Procedures:')
  })

  it('shows severity-based classification text', () => {
    renderTestingPrints()

    expect(screen.getByText('CONFIDENTIAL — ROUTINE')).toBeInTheDocument()
    expect(screen.getByText('RESTRICTED — ELEVATED RISK')).toBeInTheDocument()
    expect(screen.getByText('EYES ONLY — TERMINATE ON SIGHT AUTHORIZED')).toBeInTheDocument()
  })

  it('has a Print all button', () => {
    renderTestingPrints()

    const btn = screen.getByRole('button', { name: /print all/i })
    expect(btn).toBeInTheDocument()
  })
})
