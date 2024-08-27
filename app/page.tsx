import { createClient } from '@/utils/supabase.server'
import MainView from './MainView'
// Import the style only once in your app!
import 'react-datasheet-grid/dist/style.css'

export default async function Home() {
  const supabase = createClient()
  const { data } = await supabase.from('item').select()

  return (
    <main className="flex min-h-screen w-svw flex-col items-center justify-between p-24">
      <MainView initData={data} />
    </main>
  )
}
