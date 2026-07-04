type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function AdminExportPage({ params }: PageProps) {
  const { groupId } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Export ledger — {groupId}</h1>
    </main>
  );
}
