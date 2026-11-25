import PageHeader from "@/components/PageHeader";
import CockpitTabs from "@/components/CockpitTabs";

export default function Page() {
  return (
    <div>
      <PageHeader title="Cockpit" subtitle="Sua agenda pessoal: reuniões, follow-ups e tarefas do dia" />
      <CockpitTabs />
    </div>
  );
}
