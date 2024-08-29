import { useDrag, useDrop } from 'react-dnd'
import { supabase } from '@/utils/supabase'

const BoxType = 'BOX'

const TableHeader = ({ text, attr, attribute = [] }) => {
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
      if (monitor.didDrop()) {
        const dropResult = monitor.getDropResult()
        // When drop is done
        console.log('Dropped', item, dropResult)
        const index = attribute.findIndex((a) => a.attribute_id === attr.attribute_id)
        const newIndex = attribute.findIndex((a) => a.attribute_id === dropResult?.attr?.attribute_id) || 0

        const newOrder = [...attribute]
        newOrder.splice(index, 1)
        newOrder.splice(newIndex, 0, attr)
        console.log(newOrder)
        const { data } = await supabase.from('attributes').upsert(newOrder.map((a, index) => ({ ...a, sort_order: index })))

        console.log(data)
      }
    },
  }))
  return (
    <div ref={drop} className={'flex justify-center items-center h-full border-l-2 ' + (isOver ? 'border-color-blue-500' : 'border-transparent')}>
      <div ref={drag} className={'p-2 ' + (isDragging && ' opacity-50	border-slate-800 border-spacing-1')}>
        {text}
      </div>
    </div>
  )
}

export default TableHeader
