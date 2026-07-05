import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CreateGroupForm from './create-group-form'

export default async function NewGroupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()

  if (!profile?.stellar_public_key) redirect('/onboarding/wallet')

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <CreateGroupForm />
    </main>
  )
}
