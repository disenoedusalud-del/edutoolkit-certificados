import CertificateDetail from "@/components/CertificateDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-theme-primary p-8">
      <CertificateDetail id={id} />
    </main>
  );
}

