import type { ChangeEvent } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'

type PatientPhotoInputProps = {
  value: string
  onChange: (next: { dataUrl: string; contentType: string; capturedAt: string }) => void
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

export const PatientPhotoInput = ({ value, onChange }: PatientPhotoInputProps) => {
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const dataUrl = await readAsDataUrl(file)
    onChange({
      dataUrl,
      contentType: file.type,
      capturedAt: new Date().toISOString(),
    })
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>Patient photo</h3>
          <p className="muted">
            Take a fresh photo on mobile or upload an existing image for later identification and transfer.
          </p>
        </div>
      </div>

      <div className="photo-input">
        {value ? (
          <img className="photo-preview" src={value} alt="Patient preview" />
        ) : (
          <div className="photo-placeholder">
            <Camera size={28} />
            <p>No photo attached</p>
          </div>
        )}

        <div className="photo-actions">
          <label className="secondary-button">
            <Camera size={16} />
            Take photo
            <input
              aria-label="Take patient photo"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFileChange}
              type="file"
            />
          </label>
          <label className="secondary-button">
            <ImagePlus size={16} />
            Upload photo
            <input aria-label="Upload patient photo" accept="image/*" hidden onChange={handleFileChange} type="file" />
          </label>
          {value && (
            <button
              className="ghost-button"
              onClick={() => onChange({ dataUrl: '', contentType: '', capturedAt: '' })}
              type="button"
            >
              <Trash2 size={16} />
              Remove
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
