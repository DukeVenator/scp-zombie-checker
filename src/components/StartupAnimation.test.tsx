import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StartupAnimation, STARTUP_SOUND_DISABLED_KEY } from './StartupAnimation'

const STARTUP_SOUND_DELAY_MS = 2000

describe('StartupAnimation', () => {
  let playMock: ReturnType<typeof vi.fn>
  let AudioMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined)
    function MockAudio(this: { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; volume: number; src: string }) {
      this.play = playMock
      this.pause = vi.fn()
      this.volume = 0
      this.src = ''
    }
    AudioMock = vi.fn().mockImplementation(MockAudio)
    vi.stubGlobal('Audio', AudioMock)

    window.sessionStorage.clear()
    window.localStorage.clear()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays startup sound when visible and sound enabled (no reduced motion)', async () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter initialEntries={['/']}>
        <StartupAnimation />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('startup-screen')).toBeInTheDocument()

    vi.advanceTimersByTime(STARTUP_SOUND_DELAY_MS)

    expect(AudioMock).toHaveBeenCalledTimes(1)
    const src = AudioMock.mock.calls[0][0]
    expect(src).toMatch(/\/sounds\/startup\.mp3$/)
    const instance = AudioMock.mock.results[0].value
    expect(instance.volume).toBe(0.6)
    expect(playMock).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('does not play startup sound when sound is disabled in settings', async () => {
    window.localStorage.setItem(STARTUP_SOUND_DISABLED_KEY, '1')
    vi.useFakeTimers()
    render(
      <MemoryRouter initialEntries={['/']}>
        <StartupAnimation />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('startup-screen')).toBeInTheDocument()
    vi.advanceTimersByTime(STARTUP_SOUND_DELAY_MS)

    expect(AudioMock).not.toHaveBeenCalled()
    expect(playMock).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('does not play startup sound when prefers-reduced-motion', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    vi.useFakeTimers()
    render(
      <MemoryRouter initialEntries={['/']}>
        <StartupAnimation />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('startup-screen')).toBeInTheDocument()
    vi.advanceTimersByTime(STARTUP_SOUND_DELAY_MS)

    expect(AudioMock).not.toHaveBeenCalled()
    expect(playMock).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('does not render startup screen on /badge route', () => {
    render(
      <MemoryRouter initialEntries={['/badge']}>
        <StartupAnimation />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('startup-screen')).not.toBeInTheDocument()
    expect(AudioMock).not.toHaveBeenCalled()
  })
})
