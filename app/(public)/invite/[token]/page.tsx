type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Join a Group</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite token: {token}
        </p>
      </div>
    </main>
  );
}
