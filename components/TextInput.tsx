import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/utils/supabase'
import { deboundce } from '@/lib/utils'

const TextInput = ({
  value,
  id,
}: {
  value: string
  id: {
    entity_id: number
    attribute_id: string
  }
}) => {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setText(value)
  }, [value])

  return (
    <div className="relative">
      <Input
        type="text"
        className={(pending ? 'cursor-not-allowed border-blue-500 ' : 'border-transparent ') + ' m-0 w-full  hover:border-gray-400 '}
        value={text}
        disabled={pending}
        onChange={(e) => {
          setText(e.target.value)
          deboundce(async () => {
            setPending(true)
            let { data, error } = await supabase
              .from('values')
              .update({ value_text: e.target.value })
              .eq('attribute_id', id.attribute_id)
              .eq('entity_id', id.entity_id)
            console.log(data, error, e.target.value)
            if (error) {
              setText(value)
            }
            setPending(false)
          }, `${id.entity_id}-${id.attribute_id}`)
        }}
      />
    </div>
  )
}

export default TextInput
