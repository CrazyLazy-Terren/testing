'use client'
import { DataTable } from '@/components/data-table'
import { createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { supabase } from '@/utils/supabase'

import { Button } from '@/components/ui/button'
import TableHeader from '@/components/TableHeaer'
import TextInput from '@/components/TextInput'
import { Trash2 } from 'lucide-react'
const columnHelper = createColumnHelper()

const MainView = ({ initData, initAttriute }) => {
  const [data, setData] = useState(initData)
  const [attriute, setAttriute] = useState(initAttriute)

  const attrMap = useMemo(
    () =>
      (attriute || []).reduce((acc, attr) => {
        acc.set(attr.attribute_id, {
          name: attr.attribute_name,
          type: attr.attribute_type,
          order: attr.sort_order,
        })
        return acc
      }, new Map()),
    [attriute]
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
              const index = attriute.findIndex((item) => item.attribute_id === payload.new.attribute_id)
              if (index !== -1) {
                attriute[index] = {
                  ...attriute[index],
                  ...payload.new,
                }
                setAttriute(attriute.sort((a, b) => a.sort_order - b.sort_order))
              }
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
        <DataTable
          data={arraData}
          columns={[
            columnHelper.accessor('__action', {
              cell: () => (
                <Button variant="outline" size="icon">
                  <Trash2 />
                </Button>
              ),
              header: () => <TableHeader text="Action" />,
            }),
            ...attriute.map((attr) => {
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
                header: (info) => <TableHeader text={attr.attribute_name} attr={attr} />,
              })
            }),
          ]}
        />
      </DndProvider>
    </div>
  )
}

export default MainView
