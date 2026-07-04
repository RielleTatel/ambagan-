type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function RepaymentsPage({ params }: PageProps) {
  const { groupId } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Repayments — {groupId}</h1>
    </main>
  );
}
