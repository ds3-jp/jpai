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
        recipient.name.toLowerCase().includes(term) ||
        recipient.phone.toLowerCase().includes(term)
    )
  }, [recipients, searchTerm])

  // Get all unique column names (excluding id) with original casing preserved
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

  // Prioritize important columns first while preserving original column names
  const orderedColumns = useMemo(() => {
    const important = ['name', 'phone']
    const others = allColumns.filter(col => !important.includes(col.toLowerCase()))
    return [...important, ...others]
  }, [allColumns])

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    return String(value)
  }

  const getColumnIcon = (columnName: string) => {
    switch (columnName.toLowerCase()) {
      case 'name':
        return <User className="h-4 w-4" />
      case 'phone':
        return <Phone className="h-4 w-4" />
      default:
        return null
    }
  }

  // Function to format column header for display
  const formatColumnHeader = (columnName: string): string => {
    // For standard columns, use proper casing
    if (columnName.toLowerCase() === 'name') return 'Name'
    if (columnName.toLowerCase() === 'phone') return 'Phone'
    
    // For other columns, preserve original casing but add spaces before capitals
    return columnName.replace(/([A-Z])/g, ' $1').trim()
  }

  if (recipients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recipients uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Stats */}
      <div className="flex items-center justify-between gap-4">
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

      {/* Table */}
      <ScrollArea className="h-[400px] w-full whitespace-nowrap">
        <div className="border rounded-lg"> 
          <Table>
            <TableHeader>
              <TableRow>
                {orderedColumns.map((column) => (
                  <TableHead key={column} className="font-medium">
                    <div className="flex items-center gap-2">
                      {getColumnIcon(column)}
                      <span>
                        {formatColumnHeader(column)}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipients.length > 0 ? (
                filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    {orderedColumns.map((column) => (
                      <TableCell key={`${recipient.id}-${column}`}>
                        <div className="max-w-[200px] truncate">
                          {formatCellValue(recipient[column])}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell>
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
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Footer info */}
      {filteredRecipients.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p>
            Showing {filteredRecipients.length} recipient(s) with {orderedColumns.length} column(s)
          </p>
        </div>
      )}
    </div>
  )
}