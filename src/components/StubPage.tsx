import PageHeader from "./PageHeader";

export default function StubPage({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note?: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mx-8 rounded-xl border border-border bg-panel p-10 text-center text-muted">
        <p>Módulo em construção.</p>
        {note && <p className="text-xs mt-2">{note}</p>}
      </div>
    </div>
  );
}
