'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { createColumnHelper } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { useSortable } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'

import TextInput from '@/components/TextInput'
import { deboundce } from '@/lib/utils'
import { toast } from 'sonner'
const DataTable = dynamic(() => import('@/components/DataTable'), { ssr: false })
const columnHelper = createColumnHelper()

const RowDragHandleCell = ({ rowId }: { rowId: string }) => {
  const { attributes, listeners } = useSortable({
    id: rowId,
  })
  return (
    // Alternatively, you could set these attributes on the rows themselves
    <button {...attributes} {...listeners}>
      🟰
    </button>
  )
}

const MainView = ({ initData, initAttriute }) => {
  const [data, setData] = useState(initData)
  const [attribute, setAttribute] = useState(initAttriute)

  const attrMap = useMemo(
    () =>
      (attribute || []).reduce((acc, attr) => {
        acc.set(attr.attribute_id, {
          name: attr.attribute_name,
          type: attr.attribute_type,
          order: attr.sort_order,
        })
        return acc
      }, new Map()),
    [attribute]
  )

  const arraData = useMemo(() => {
    const dataArr: Record<string, any>[] = []
    // combine the entity data into one row
    ;(data || []).forEach((row) => {
      const lastRow = dataArr[dataArr.length - 1]
      if (lastRow && lastRow.entity_id === row.entity_id) {
        const name = attrMap.get(row.attribute_id).name
        if (name) {
          dataArr[dataArr.length - 1] = {
            ...lastRow,
            [name]: row.value_text,
          }
        }
      } else {
        dataArr.push({
          entity_id: row.entity_id,
          row_order: row.row_order,
          [attrMap.get(row.attribute_id).name]: row.value_text,
        })
      }
    })
    console.log('dataArr', dataArr)
    return dataArr
  }, [attrMap, data])

  const columns = useMemo(
    () => [
      columnHelper.accessor('__move', {
        header: 'Move',
        cell: ({ row }) => <RowDragHandleCell rowId={row.id} />,
        size: 60,
      }),
      ...attribute.map((attr) => {
        return columnHelper.accessor(attr.attribute_name, {
          cell: (info) => {
            if (attr.attribute_type === 'text') {
              return (
                <TextInput
                  value={info.getValue() || ''}
                  id={{
                    entity_id: info.row.original.entity_id,
                    attribute_id: attr.attribute_id,
                  }}
                />
              )
            } else {
              return info.renderValue()
            }
          },
        })
      }),
      columnHelper.accessor('__action', {
        header: 'Action',
        cell: (info) => (
          <Button
            onClick={async () => {
              console.log('delete', info.row.original)
              await supabase.from('values').delete().eq('entity_id', info.row.original.entity_id)
              await supabase.from('entities').delete().eq('entity_id', info.row.original.entity_id)
            }}
            variant="outline"
            size="icon">
            <Trash2 />
          </Button>
        ),
      }),
    ],
    [attribute]
  )

  useEffect(() => {
    const valuesChange = supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: '*' }, (payload) => {
        if (payload.table === 'entities') {
          switch (payload.eventType) {
            case 'DELETE':
              setData([...data].filter((item) => item.entity_id !== payload.old.entity_id))

              break
          }
        }
        if (payload.table === 'values') {
          switch (payload.eventType) {
            case 'DELETE':
            case 'INSERT':
            case 'UPDATE':
              deboundce(
                async () => {
                  const { data } = await supabase.from('values').select('*').order('row_order', { ascending: true })
                  setData(data || [])
                  console.log('Change received!', payload)
                },
                'values',
                300
              )
              break
          }
        }
        if (payload.table === 'attributes') {
          switch (payload.eventType) {
            case 'UPDATE':
            case 'INSERT':
            case 'DELETE':
              deboundce(
                async () => {
                  const data = await supabase.from('attributes').select('*').order('sort_order', { ascending: true })
                  setAttribute(data.data || [])
                },
                'attribute',
                300
              )
              break
          }
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(valuesChange)
    }
    // will be called every time the data changes should be called only once
  }, [data, setData])

  const moveAttribute = useCallback(
    async (fromName: string, toName: string) => {
      const fromIndex = attribute.findIndex((item) => item.attribute_name === fromName)
      const toIndex = attribute.findIndex((item) => item.attribute_name === toName)
      const newArr = [...attribute]
      newArr.splice(fromIndex, 1)
      if (toIndex === -1) {
        newArr.splice(toIndex, 0, attribute[fromIndex])
      } else {
        newArr.splice(0, 0, attribute[fromIndex])
      }

      await supabase.from('attributes').upsert(
        newArr.map((attr, index) => ({
          ...attr,
          sort_order: index,
        }))
      )
    },
    [attribute]
  )

  const moveRow = useCallback(
    async (fromId, toId) => {
      const fromIndex = arraData.findIndex((item) => item.entity_id === fromId)
      const toIndex = arraData.findIndex((item) => item.entity_id === toId)
      if (fromIndex === -1 || toIndex === -1) {
        return
      }
      console.log('from', fromIndex, 'to', toIndex)
      const newArr = [...arraData]
      newArr.splice(fromIndex, 1)
      const newOrder = (parseFloat(arraData[toIndex].row_order) + (arraData[toIndex - 1]?.row_order || 0)) / 2
      newArr.splice(toIndex, 0, {
        ...arraData[fromIndex],
        row_order: newOrder,
      })
      const newData = newArr.flatMap((item, index) => {
        return Object.keys(item)
          .map((key) => {
            return {
              attribute_id: attribute.find((attr) => attr.attribute_name === key)?.attribute_id,
              entity_id: item.entity_id,
              value_text: item[key],
              row_order: item.row_order,
            }
          })
          .filter((item) => item.attribute_id)
      })
      console.log('newData', newData)
      setData(newData)
      await supabase
        .from('values')
        .update({
          row_order: newOrder,
        })
        .eq('entity_id', arraData[fromIndex].entity_id)

      toast.success('Row moved successfully')
    },
    [arraData]
  )

  return (
    <div className="w-full h-full">
      <Button
        className="mb-4"
        onClick={async () => {
          const last = arraData[arraData.length - 1]
          const entity_id = last?.entity_id
          if (entity_id) {
            await supabase.from('entities').insert({ entity_id: entity_id + 1, entity_name: 'new entity' })
            await supabase.from('values').upsert(
              attribute.map((attr) => ({
                row_order: last.row_roder + 1,
                entity_id: entity_id + 1,
                attribute_id: attr.attribute_id,
                value_text: '',
              }))
            )
          }
        }}>
        Add
      </Button>
      <DataTable data={arraData} columns={columns} moveRow={moveRow} moveAttribute={moveAttribute} />
    </div>
  )
}

export default MainView
