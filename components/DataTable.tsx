'use client'

import { useMemo, useState, useRef, ReactElement } from 'react'

import {
  Cell,
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, TouchSensor, UniqueIdentifier } from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers'

import { CSS } from '@dnd-kit/utilities'
import TableHead from '@/components/TableHead'

import { DataTablePagination } from './data-table-pagination'
import { toast } from 'sonner'
import { type RowData } from '@/app/MainView'
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  moveRow: (fromId: UniqueIdentifier, toId: UniqueIdentifier) => Promise<void>
  moveAttribute: (fromName: UniqueIdentifier, toName: UniqueIdentifier) => Promise<void>
}

const DraggableRow = ({ row, children, ...rest }: { row: Row<RowData>; children: ReactElement; [key: string]: any }) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.entity_id ?? '',
  })
  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), //let dnd-kit do its thing
        transition: transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
      }}
      {...rest}>
      {children}
    </TableRow>
  )
}

const DragAlongCell = ({ cell }: { cell: Cell<RowData, any> }) => {
  const { isDragging, setNodeRef, transform } = useSortable({
    id: cell.column.id ?? '',
  })

  return (
    <TableCell
      style={{
        opacity: isDragging ? 0.8 : 1,
        position: 'relative',
        transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
        transition: 'width transform 0.2s ease-in-out',
        width: cell.column.getSize(),
        zIndex: isDragging ? 1 : 0,
      }}
      className="bg-white"
      ref={setNodeRef}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  )
}

export default function DataTable<TData, TValue>({ columns, data, moveRow, moveAttribute }: DataTableProps<RowData, TValue>) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  /* @ts-expect-error */
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((c) => c.accessorKey))

  const pointerSenor = useSensors(useSensor(PointerSensor))
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const table = useReactTable({
    initialState: {
      columnPinning: {
        left: ['__move'],
        right: ['__action'],
      },
      //...
    },
    data,
    columns,

    state: {
      columnOrder,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    onColumnOrderChange: setColumnOrder,

    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => String(row.entity_id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const dataIds = useMemo(() => data.map((d) => String(d.entity_id)), [data])

  function handleRowDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id && over) {
      console.log('active', active.id, 'over', over?.id)
      moveRow(active.id, over.id)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id && over) {
      console.log('active', active.id, 'over', over.id)
      const msg = toast.info('Moving attribute...')
      await moveAttribute(active.id, over.id)
      toast.dismiss(msg)
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string)
        const newIndex = columnOrder.indexOf(over?.id as string)
        return arrayMove(columnOrder, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <DndContext id="2" collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleRowDragEnd} sensors={sensors}>
          <Table>
            <DndContext
              accessibility={{
                container: document?.body,
              }}
              id="1"
              sensors={pointerSenor}
              modifiers={[restrictToHorizontalAxis]}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} header={header}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        )
                      })}
                    </SortableContext>
                  </TableRow>
                ))}
              </TableHeader>
            </DndContext>
            <TableBody>
              <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} data-state={row.getIsSelected() && 'selected'}>
                      <>
                        {row.getVisibleCells().map((cell) => (
                          <SortableContext key={cell.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                            <DragAlongCell cell={cell} />
                          </SortableContext>
                        ))}
                      </>
                    </DraggableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
