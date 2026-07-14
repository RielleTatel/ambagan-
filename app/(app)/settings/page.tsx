export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { FullNameForm } from './full-name-form'
import { PasswordForm } from './password-form'
import { LogoutButton } from '@/components/logout-button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, stellar_public_key, is_custodial')
    .eq('id', user.id)
    .single()

  const fullName = profile?.full_name ?? ''
  const isCustodial = profile?.is_custodial ?? true

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Settings</h1>
        <p className="text-sm text-body-subtle">
          Manage your account.
        </p>
      </div>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Account</h2>
        <FullNameForm currentName={fullName} />
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
            Email
          </p>
          <p className="mt-1 text-sm font-medium text-heading">{user.email}</p>
          <p className="mt-1 text-xs text-body-subtle">
            Email changes are not supported yet. Contact support.
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Password</h2>
        <PasswordForm />
      </section>

      <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Wallet</h2>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
            Mode
          </p>
          <p className="mt-1 text-sm font-medium text-heading">
            {isCustodial ? 'Custodial (managed by Ambagan)' : 'Freighter'}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
            Stellar public key
          </p>
          <p className="mt-1 break-all font-mono text-xs text-body">
            {profile?.stellar_public_key ?? '—'}
          </p>
        </div>
        <p className="mt-4 text-xs text-body-subtle">
          Switching to Freighter is not enabled in this build.
        </p>
      </section>

      <section className="rounded-xl border-2 border-border-danger bg-neutral-primary p-6 shadow-xs mt-6">
        <h2 className="mb-1 text-lg font-bold text-heading">Sign out</h2>
        <p className="mb-4 text-sm text-body-subtle">You will be returned to the login page.</p>
        <LogoutButton /> 
        
      </section>
    </main>
  )
}
