'use client'

import React, { useState } from 'react'
import { BatchHistoryTable } from '@/components/batch/batch-history-table'
import { BatchSidePanel } from '@/components/batch/batch-side-panel'

const BatchCallingPage = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
  const [newBatch, setNewBatch] = useState(null)

  const handleAddBatch = () => {
    setIsSidePanelOpen(true)
  }

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false)
  }

  const handleBatchCreated = (batch: any) => {
    setNewBatch(batch)
    setIsSidePanelOpen(false)
  }

  return (
    <div className="px-4 mx-auto">
      <div className="space-y-6">

        {/* Main Content */}
        <BatchHistoryTable onAddBatch={handleAddBatch} newBatch={newBatch} />

        {/* Side Panel */}
        <BatchSidePanel
          isOpen={isSidePanelOpen}
          onClose={handleCloseSidePanel}
          onBatchCreated={handleBatchCreated}
        />
      </div>
    </div>
  )
}

export default BatchCallingPage