'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'

interface Recipient {
  id: string
  recipient_id: string // Add recipient_id field
  name: string
  phone: string
  [key: string]: any
}

interface CSVUploaderProps {
  onDataParsed: (data: Recipient[]) => void
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataParsed }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const processCSV = useCallback((file: File) => {
    setIsProcessing(true)
    setError('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Remove the transformHeader function to preserve original column names
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            const errorMessages = results.errors.map(err => err.message).join(', ')
            setError(`CSV parsing errors: ${errorMessages}`)
            setIsProcessing(false)
            return
          }

          const data = results.data as any[]
          
          if (data.length === 0) {
            setError('CSV file is empty or contains no valid data')
            setIsProcessing(false)
            return
          }

          // Create a case-insensitive mapping for required columns
          const firstRow = data[0]
          const columnNames = Object.keys(firstRow)
          
          // Find the actual column names (case-insensitive)
          const findColumnName = (searchFor: string) => {
            return columnNames.find(col => col.toLowerCase().trim() === searchFor.toLowerCase())
          }
          
          const fullNameColumn = findColumnName('fullname')
          const numberColumn = findColumnName('number')
          
          const requiredColumns = ['fullname', 'number']
          const missingColumns: string[] = []
          
          if (!fullNameColumn) missingColumns.push('fullname')
          if (!numberColumn) missingColumns.push('number')

          if (missingColumns.length > 0) {
            setError(`Missing required columns: ${missingColumns.join(', ')}. Please ensure your CSV has 'fullname' and 'number' columns (case-insensitive).`)
            setIsProcessing(false)
            return
          }

          // Transform data and add IDs while preserving original column names
          const recipients: Recipient[] = data
            .filter(row => row[fullNameColumn!] && row[numberColumn!])
            .map((row, index) => {
              // Generate unique recipient_id using timestamp, batch identifier, and row index
              const timestamp = Date.now()
              const recipient_id = `recipient_${timestamp}_${index + 1}_${Math.random().toString(36).substr(2, 6)}`
              
              // Create a new object with preserved column names
              const recipient: Recipient = {
                id: uuidv4(), // Keep existing id for UI purposes
                recipient_id, // Add new recipient_id for API calls
                name: String(row[fullNameColumn!]).trim(),
                phone: String(row[numberColumn!]).trim()
              }
              
              // Add all other columns with their original names
              Object.keys(row).forEach(originalKey => {
                if (originalKey !== fullNameColumn && originalKey !== numberColumn) {
                  recipient[originalKey] = row[originalKey]
                }
              })
              
              return recipient
            })

          if (recipients.length === 0) {
            setError('No valid recipients found. Please ensure your CSV has valid name and phone data.')
            setIsProcessing(false)
            return
          }

          console.log('Generated recipients with recipient_ids:', recipients.slice(0, 3)) // Log first 3 for debugging

          onDataParsed(recipients)
          setIsProcessing(false)
        } catch (err) {
          console.error('Error processing CSV:', err)
          setError('Failed to process CSV file. Please check the file format.')
          setIsProcessing(false)
        }
      },
      error: (error) => {
        console.error('Papa Parse error:', error)
        setError(`Failed to read CSV file: ${error.message}`)
        setIsProcessing(false)
      }
    })
  }, [onDataParsed])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      processCSV(file)
    }
  }, [processCSV])

  const removeFile = () => {
    setUploadedFile(null)
    setError('')
    onDataParsed([])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  })

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop the CSV file here...</p>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">Upload CSV File</p>
              <p className="text-xs text-muted-foreground mb-3">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Choose File
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{uploadedFile.name}</span>
            <Badge variant="secondary" className="text-xs">
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={removeFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isProcessing && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            Processing CSV file...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !isProcessing && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Required columns: <code>fullname</code>, <code>number</code> (case-insensitive)</li>
            <li>First row should contain column headers</li>
            <li>Additional columns are allowed and will be preserved with original names</li>
            <li>Each recipient will be assigned a unique <code>recipient_id</code> automatically</li>
          </ul>
        </div>
      )}
    </div>
  )
}