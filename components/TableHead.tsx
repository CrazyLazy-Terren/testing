import React, { ReactElement, useState } from 'react'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TableHead } from '@/components/ui/table'
import { Header } from '@tanstack/react-table'
import { type RowData } from '@/app/MainView'

const TableHeader = ({ header, children }: { header: Header<RowData, any>; children: React.ReactNode }) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: header.column.id })
  return (
    <TableHead
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.8 : 1,
        position: 'relative',
        transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
        transition: 'width transform 0.2s ease-in-out',
        whiteSpace: 'nowrap',
        width: header.column.getSize(),
        zIndex: isDragging ? 1 : 0,
      }}
      {...attributes}
      {...listeners}
      className="p-2">
      {children}
    </TableHead>
  )
}

export default TableHeader
