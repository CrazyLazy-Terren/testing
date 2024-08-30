import { createClient } from '@/utils/supabase.server'
import MainView from './MainView'
import { Toaster } from '@/components/ui/sonner'

export default async function Home() {
  const supabase = createClient()
  const { data: attrData } = await supabase.from('attributes').select('*').order('sort_order', { ascending: true })
  const { data } = await supabase.from('values').select('*').order('row_order', { ascending: true })
  

  return (
    <>
      <Toaster position="top-center" richColors />
      <main className="flex min-h-screen w-svw flex-col items-center justify-between p-24">
        <MainView initData={data || []} initAttriute={attrData || []} />
      </main>
    </>
  )
}
