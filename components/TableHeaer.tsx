import React, { useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { supabase } from '@/utils/supabase'
import { cn } from '@/lib/utils'

const BoxType = 'BOX'

const TableHeader = ({ text, attr, attribute = [] }) => {
  const [pending, setPending] = useState(false)
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: BoxType,
    // Props to collect
    drop: () => ({ attr }),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))
  const [{ isDragging }, drag] = useDrag(() => ({
    type: BoxType,
    item: { attr },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: async (item, monitor) => {
      if (monitor.didDrop() && !pending) {
        const dropResult = monitor.getDropResult()
        // When drop is done
        console.log('Dropped', item, dropResult)
        const index = attribute.findIndex((a) => a.attribute_id === attr.attribute_id)
        const newIndex = attribute.findIndex((a) => a.attribute_id === dropResult?.attr?.attribute_id) || 0

        const newOrder = [...attribute]
        newOrder.splice(index, 1)
        newOrder.splice(newIndex, 0, attr)
        console.log(newOrder)
        setPending(true)
        const { data } = await supabase.from('attributes').upsert(newOrder.map((a, index) => ({ ...a, sort_order: index })))
        setPending(false)
      }
    },
  }))
  return (
    <div
      ref={drop}
      className={cn('flex justify-center items-center h-full ', {
        'bg-blue-100': isOver && !pending,
        ' opacity-50	': isDragging,
      })}>
      <div ref={drag} className="p-2 w-full">
        {text}
      </div>
    </div>
  )
}

export default TableHeader
