import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientPhotoInput } from './PatientPhotoInput'

class MockFileReader {
  public result: string | ArrayBuffer | null = null
  public error: DOMException | null = null
  public onload: null | (() => void) = null
  public onerror: null | (() => void) = null

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,mock-photo`
    this.onload?.()
  }
}

describe('PatientPhotoInput', () => {
  const originalFileReader = globalThis.FileReader

  beforeEach(() => {
    vi.stubGlobal('FileReader', MockFileReader)
  })

  afterEach(() => {
    globalThis.FileReader = originalFileReader
    vi.unstubAllGlobals()
  })

  it('exposes a mobile camera capture input and a regular upload input', () => {
    render(<PatientPhotoInput onChange={vi.fn()} value="" />)

    const cameraInput = screen.getByLabelText(/take patient photo/i)
    const uploadInput = screen.getByLabelText(/upload patient photo/i)

    expect(cameraInput).toHaveAttribute('accept', 'image/*')
    expect(cameraInput).toHaveAttribute('capture', 'environment')
    expect(uploadInput).toHaveAttribute('accept', 'image/*')
    expect(uploadInput).not.toHaveAttribute('capture')
  })

  it('reads the selected photo and reports it to the parent', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PatientPhotoInput onChange={onChange} value="" />)

    const file = new File(['photo'], 'patient.jpg', { type: 'image/jpeg' })
    const uploadInput = screen.getAllByLabelText(/upload patient photo/i).at(-1)
    expect(uploadInput).toBeDefined()
    await user.upload(uploadInput as HTMLInputElement, file)

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      dataUrl: 'data:image/jpeg;base64,mock-photo',
      contentType: 'image/jpeg',
    })
  })
})
