import { SignUpForm } from '@/components/sign-up-form'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-warm-bg p-6 md:p-10">
      <div className="w-full max-w-md">
        <SignUpForm inviteToken={invite} />
      </div>
    </main>
  )
}
