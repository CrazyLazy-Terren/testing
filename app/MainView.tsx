'use client'
import { DataTable } from '@/components/data-table'
import { Input } from '@/components/ui/input'

import { createColumnHelper } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { supabase, type Item } from '@/utils/supabase'

const columnHelper = createColumnHelper<Item>()

const memoize = new Map()

const deboundce = (fn: () => void, id: string) => {
  if (memoize.has(id)) {
    clearTimeout(memoize.get(id))
  }
  memoize.set(
    id,
    setTimeout(() => {
      fn()
      memoize.delete(id)
    }, 1000)
  )
}

const columns = [
  columnHelper.accessor('id', {
    cell: (info) => String(info.getValue()),
    header: (info) => info.column.id,
  }),
  columnHelper.accessor('created_at', {
    cell: (info) => info.getValue(),
    header: (info) => info.column.id,
  }),
  columnHelper.accessor('text', {
    cell: (info) => (
      <Input
        type="text"
        defaultValue={info.getValue() || ''}
        onChange={(e) => {
          deboundce(async () => {
            await supabase.from('item').update({ text: e.target.value }).eq('id', String(info.row.original.id)).select()
            console.log('onChange', e.target.value, info.row.original.id)
          }, String(info.row.original.id))
        }}
      />
    ),
    header: (info) => info.column.id,
  }),
  columnHelper.accessor('img', {
    cell: (info) => info.getValue(),
    header: (info) => info.column.id,
  }),
]
const MainView = ({ initData }: { initData: Item[] }) => {
  const [data, setData] = useState<Item[]>(initData)

  useEffect(() => {
    const channel = supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item' }, (payload) => {
        console.log('Change received!', payload)
        switch (payload.eventType) {
          case 'INSERT':
          case 'UPDATE':
            const index = data.findIndex((item) => item.id === payload.new.id)
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
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // will be called every time the data changes should be called only once
  }, [data, setData])

  return (
    <div className="w-full h-full">
      <DataTable data={data} columns={columns} />
    </div>
  )
}

export default MainView
