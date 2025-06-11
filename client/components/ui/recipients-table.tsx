'use client'

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Trash2, Search, MoreHorizontal, User, Phone } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface Recipient {
  id: string
  name: string
  phone: string
  [key: string]: any
}

interface RecipientsTableProps {
  recipients: Recipient[]
  onRemoveRecipient: (id: string) => void
}

export const RecipientsTable: React.FC<RecipientsTableProps> = ({
  recipients,
  onRemoveRecipient,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter recipients based on search term
  const filteredRecipients = useMemo(() => {
    if (!searchTerm.trim()) return recipients
    
    const term = searchTerm.toLowerCase()
    return recipients.filter(
      recipient =>
        recipient.fullname?.toLowerCase().includes(term) ||
        recipient.number?.toLowerCase().includes(term)
    )
  }, [recipients, searchTerm])

  // Get all unique column names (excluding id)
  const allColumns = useMemo(() => {
    const columnSet = new Set<string>()
    recipients.forEach(recipient => {
      Object.keys(recipient).forEach(key => {
        if (key !== 'id') {
          columnSet.add(key)
        }
      })
    })
    return Array.from(columnSet)
  }, [recipients])

  // Prioritize important columns first
  const orderedColumns = useMemo(() => {
    const important = ['fullname', 'number']
    const others = allColumns.filter(col => !important.includes(col))
    return [...important, ...others]
  }, [allColumns])

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    return String(value)
  }

  const getColumnIcon = (columnName: string) => {
    switch (columnName.toLowerCase()) {
      case 'fullname':
        return <User className="h-4 w-4" />
      case 'number':
        return <Phone className="h-4 w-4" />
      default:
        return null
    }
  }

  if (recipients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recipients uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Search and Stats */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredRecipients.length} of {recipients.length} recipients
          </Badge>
        </div>
      </div>

      {/* Table with Proper Scrollbars */}
      <div className="border rounded-lg overflow-hidden flex-1 min-h-0">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                {orderedColumns.map((column) => (
                  <TableHead key={column} className="font-medium min-w-[150px]">
                    <div className="flex items-center gap-2">
                      {getColumnIcon(column)}
                      <span className="capitalize">
                        {column.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[80px] min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipients.length > 0 ? (
                filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    {orderedColumns.map((column) => (
                      <TableCell key={`${recipient.id}-${column}`} className="min-w-[150px] max-w-[300px]">
                        <div className="break-words">
                          {formatCellValue(recipient[column])}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="w-[80px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onRemoveRecipient(recipient.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={orderedColumns.length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No recipients match your search criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>

      {/* Footer info */}
      {filteredRecipients.length > 0 && (
        <div className="text-xs text-muted-foreground flex-shrink-0">
          <p>
            Showing {filteredRecipients.length} recipient(s) with {orderedColumns.length} column(s)
          </p>
        </div>
      )}
    </div>
  )
}