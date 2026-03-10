import { useRef, useState } from 'react'
import { validateSessionsData } from '@/utils/metrics'
import type { SessionsData } from '@/types'

interface FileUploadProps {
  onDataLoaded: (data: SessionsData) => void
  onError: (message: string) => void
  error: string | null
}

export default function FileUpload({ onDataLoaded, onError, error }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function processFile(file: File) {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      onError('Please upload a JSON file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw: unknown = JSON.parse(e.target?.result as string)
        if (!validateSessionsData(raw)) {
          onError(
            'Invalid JSON structure. Expected { sessions: [], date_range: { start, end } }.',
          )
          return
        }
        onDataLoaded(raw)
      } catch {
        onError('Failed to parse JSON. Make sure the file is valid JSON.')
      }
    }
    reader.readAsText(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <h1 className="text-2xl font-bold text-gray-900">Devin Usage Analytics</h1>
          <p className="mt-2 text-gray-500">
            Upload your Devin sessions JSON to analyze value per ACU.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-3xl mb-3">📁</div>
          <p className="text-gray-700 font-medium">Drop your JSON file here</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="text-xs text-gray-400 text-center">
          Data is processed locally in your browser — nothing is uploaded to any server.
        </div>
      </div>
    </div>
  )
}
