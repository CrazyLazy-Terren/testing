import { useDrag, useDrop } from 'react-dnd'
import { supabase } from '@/utils/supabase'

const BoxType = 'BOX'

const TableHeader = ({ text, attr }) => {
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
        const { data } = await supabase
          .from('attributes')
          .update({ sort_order: dropResult?.attr?.sort_order || 0 })
          .eq('attribute_id', attr.attribute_id)
          .select()
        console.log(data)
      }
    },
  }))
  return (
    <div ref={drop} className={'flex justify-center items-center h-full border-r-2 ' + (isOver ? 'border-color-blue-500' : 'border-transparent')}>
      <div ref={drag} className={'p-2 ' + (isDragging && ' opacity-50	border-slate-800 border-spacing-1')}>
        {text}
      </div>
    </div>
  )
}

export default TableHeader
