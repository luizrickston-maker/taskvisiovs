import InboxMental from '@/components/foco/InboxMental';
import AcoesHoje from '@/components/foco/AcoesHoje';
import Agenda48h from '@/components/foco/Agenda48h';

export default function FocoDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Top Section: Inbox + Today's Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InboxMental />
        <AcoesHoje />
      </div>

      {/* Bottom Section: 48h Agenda */}
      <Agenda48h />
    </div>
  );
}
