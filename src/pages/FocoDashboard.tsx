import { SectionBoundary } from '@/components/SectionBoundary';
import InboxMental from '@/components/foco/InboxMental';
import AcoesHoje from '@/components/foco/AcoesHoje';
import Agenda48h from '@/components/foco/Agenda48h';
import ActivityHistory from '@/components/foco/ActivityHistory';

export default function FocoDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Top Section: Inbox + Today's Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBoundary name="Inbox Mental">
          <InboxMental />
        </SectionBoundary>
        <SectionBoundary name="Ações de Hoje">
          <AcoesHoje />
        </SectionBoundary>
      </div>

      {/* Middle Section: 48h Agenda */}
      <SectionBoundary name="Agenda 48h">
        <Agenda48h />
      </SectionBoundary>

      {/* Bottom Section: Activity History */}
      <SectionBoundary name="Histórico">
        <ActivityHistory />
      </SectionBoundary>
    </div>
  );
}
