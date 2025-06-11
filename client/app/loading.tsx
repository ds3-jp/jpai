import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-lg">Loading...</span>
      </div>
    </div>
  )
}