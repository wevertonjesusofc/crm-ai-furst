import AgentePlaygroundPage from "@/components/agentes/AgentePlaygroundPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentePlaygroundPage agenteId={id} />;
}
