import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollText, Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const severityConfig = {
  info: { color: 'bg-blue-100 text-blue-800', icon: Info },
  warning: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  critical: { color: 'bg-destructive/10 text-destructive', icon: AlertOctagon }
};

const kindColors = {
  mission: 'bg-purple-100 text-purple-800',
  goal: 'bg-green-100 text-green-800',
  memory: 'bg-orange-100 text-orange-800',
  thread: 'bg-blue-100 text-blue-800',
  system: 'bg-muted text-muted-foreground'
};

export default function AuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AuditEvent.list('-created_date', 100).then(data => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText className="w-5 h-5" />
        <h1 className="text-xl font-bold">Audit Log</h1>
        <Badge variant="outline">{events.length} events</Badge>
      </div>

      <ScrollArea className="flex-1">
        {loading && <p className="text-muted-foreground text-sm text-center py-10">Loading…</p>}
        {!loading && events.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No audit events yet.</p>
          </div>
        )}
        <div className="flex flex-col gap-2 max-w-3xl mx-auto">
          {events.map(event => {
            const { color, icon: Icon } = severityConfig[event.severity] || severityConfig.info;
            return (
              <div key={event.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-medium">{event.event_type}</span>
                    <Badge className={kindColors[event.entity_kind]}>{event.entity_kind}</Badge>
                    <Badge className={color}>{event.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {event.created_date ? formatDistanceToNow(new Date(event.created_date), { addSuffix: true }) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}