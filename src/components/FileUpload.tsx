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
  const [loadingExample, setLoadingExample] = useState(false)

  async function handleLoadExample() {
    setLoadingExample(true)
    try {
      const res = await fetch('/example.json')
      const raw: unknown = await res.json()
      if (!validateSessionsData(raw)) {
        onError('Invalid JSON structure. Expected { sessions: [], date_range: { start, end } }.')
        return
      }
      onDataLoaded(raw)
    } catch {
      onError('Could not load example data.')
    } finally {
      setLoadingExample(false)
    }
  }

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
      <a
        href="https://github.com/wdsrocha/devin-usage-analytics"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
        className="fixed top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors p-1.5"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
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

        <div className="flex items-center gap-3 text-gray-300">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="text-center">
          <button
            onClick={handleLoadExample}
            disabled={loadingExample}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer underline underline-offset-2"
          >
            {loadingExample ? 'Loading…' : 'Try with example data →'}
          </button>
          <p className="text-xs text-gray-400 mt-1">Star Wars Jedi Council org · 78 sessions</p>
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
