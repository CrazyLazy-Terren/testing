'use client'
import { DataTable } from '@/components/data-table'
import { createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/utils/supabase'

import { Button } from '@/components/ui/button'
import TableHeader from '@/components/TableHeaer'
import TextInput from '@/components/TextInput'
import { deboundce } from '@/lib/utils'
const columnHelper = createColumnHelper()

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
        dataArr[dataArr.length - 1] = {
          ...lastRow,
          [attrMap.get(row.attribute_id).name]: row.value_text,
        }
      } else {
        dataArr.push({
          entity_id: row.entity_id,
          [attrMap.get(row.attribute_id).name]: row.value_text,
        })
      }
    })
    return dataArr
  }, [attrMap, data])

  const columns = useMemo(
    () => [
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
          header: (info) => <TableHeader text={attr.attribute_name} attr={attr} attribute={attribute} />,
        })
      }),
      columnHelper.accessor('__action', {
        cell: () => (
          <Button variant="outline" size="icon" disabled>
            <Trash2 />
          </Button>
        ),
        header: () => <TableHeader text="Action" />,
      }),
    ],
    [attribute]
  )

  useEffect(() => {
    const valuesChange = supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: '*' }, (payload) => {
        console.log('Change received!', payload)
        if (payload.table === 'values') {
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              const index = data.findIndex((item) => item.value_id === payload.new.value_id)
              if (index !== -1) {
                data[index] = {
                  ...data[index],
                  ...payload.new,
                }
                setData([...data])
              } else {
                setData([...data, payload.new as Item])
              }
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

  return (
    <div className="w-full h-full">
      <DndProvider backend={HTML5Backend}>
        <DataTable data={arraData} columns={columns} />
      </DndProvider>
    </div>
  )
}

export default MainView
