'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function updateFullName(
  newName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const trimmed = newName.trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { ok: false, error: 'Name must be 1–80 characters' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/profile')
  return { ok: true }
}
