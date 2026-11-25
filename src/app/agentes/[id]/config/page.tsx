import AgenteConfigPage from "@/components/agentes/AgenteConfigPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgenteConfigPage agenteId={id} />;
}
