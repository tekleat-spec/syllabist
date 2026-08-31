import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = '6a94fea443cf927a65b7f66d';
const GOOGLE_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get the current app user's Google Calendar connection
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({ connected: false, message: 'Google Calendar not connected' });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'full';
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const results = { created: 0, updated: 0, deleted: 0, errors: [] };

    // ---- Study session push (from StudyScheduler) ----
    if (mode === 'study') {
      const sessions = body.sessions || [];
      for (const s of sessions) {
        const startISO = new Date(s.start).toISOString();
        const endISO = new Date(new Date(s.start).getTime() + (s.durationHours || 1) * 3600000).toISOString();
        const gEvent = {
          summary: s.title || 'Study Session',
          description: s.description || '',
          start: { dateTime: startISO },
          end: { dateTime: endISO },
        };
        const res = await fetch(GOOGLE_API, { method: 'POST', headers: authHeader, body: JSON.stringify(gEvent) });
        if (res.ok) {
          const gData = await res.json();
          await base44.entities.CalendarEvent.create({
            title: s.title || 'Study Session',
            course_id: s.course_id || undefined,
            event_type: 'study_session',
            start_date: startISO,
            end_date: endISO,
            description: s.description || '',
            google_event_id: gData.id,
          });
          results.created++;
        } else {
          const errText = await res.text();
          console.error('Google study event create failed:', errText);
          results.errors.push(`Study session "${s.title}" failed`);
        }
      }
      return Response.json({ connected: true, ...results });
    }

    // Fetch user-scoped data
    const [assignments, courses, existingEvents] = await Promise.all([
      base44.entities.Assignment.filter({ created_by_id: user.id }),
      base44.entities.Course.filter({ created_by_id: user.id }),
      base44.entities.CalendarEvent.filter({ created_by_id: user.id }),
    ]);

    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
    const eventByAssignment = {};
    for (const ev of existingEvents) {
      if (ev.assignment_id) eventByAssignment[ev.assignment_id] = ev;
    }

    // ---- Delete a single assignment's event ----
    if (mode === 'delete-assignment') {
      const ev = eventByAssignment[body.assignmentId];
      if (ev) {
        if (ev.google_event_id) {
          await fetch(`${GOOGLE_API}/${ev.google_event_id}`, { method: 'DELETE', headers: authHeader });
        }
        await base44.entities.CalendarEvent.delete(ev.id);
        results.deleted++;
      }
      return Response.json({ connected: true, ...results });
    }

    // ---- Full sync: push all assignment deadlines ----
    for (const assignment of assignments) {
      if (!assignment.due_date) continue;
      const course = courseMap[assignment.course_id];
      const title = course ? `[${course.name}] ${assignment.title}` : assignment.title;
      const existing = eventByAssignment[assignment.id];

      if (!existing) {
        const ev = await base44.entities.CalendarEvent.create({
          title,
          assignment_id: assignment.id,
          course_id: assignment.course_id || undefined,
          event_type: 'deadline',
          start_date: assignment.due_date,
          end_date: assignment.due_date,
          description: assignment.description || '',
        });
        const gEvent = buildDeadlineEvent(title, assignment.due_date, assignment.description);
        const res = await fetch(GOOGLE_API, { method: 'POST', headers: authHeader, body: JSON.stringify(gEvent) });
        if (res.ok) {
          const gData = await res.json();
          await base44.entities.CalendarEvent.update(ev.id, { google_event_id: gData.id });
          results.created++;
        } else {
          const errText = await res.text();
          console.error('Google deadline create failed:', errText);
          results.errors.push(`"${assignment.title}" create failed`);
        }
      } else {
        const needsUpdate = existing.title !== title || existing.start_date !== assignment.due_date;
        if (needsUpdate) {
          await base44.entities.CalendarEvent.update(existing.id, {
            title, start_date: assignment.due_date, end_date: assignment.due_date,
          });
          const gEvent = buildDeadlineEvent(title, assignment.due_date, assignment.description);
          if (existing.google_event_id) {
            await fetch(`${GOOGLE_API}/${existing.google_event_id}`, { method: 'PUT', headers: authHeader, body: JSON.stringify(gEvent) });
            results.updated++;
          } else {
            const res = await fetch(GOOGLE_API, { method: 'POST', headers: authHeader, body: JSON.stringify(gEvent) });
            if (res.ok) {
              const gData = await res.json();
              await base44.entities.CalendarEvent.update(existing.id, { google_event_id: gData.id });
            }
            results.created++;
          }
        }
      }
    }

    // Clean up events for deleted assignments
    const assignmentIds = new Set(assignments.map(a => a.id));
    for (const ev of existingEvents) {
      if (ev.event_type === 'deadline' && ev.assignment_id && !assignmentIds.has(ev.assignment_id)) {
        if (ev.google_event_id) {
          await fetch(`${GOOGLE_API}/${ev.google_event_id}`, { method: 'DELETE', headers: authHeader });
        }
        await base44.entities.CalendarEvent.delete(ev.id);
        results.deleted++;
      }
    }

    return Response.json({ connected: true, ...results });
  } catch (error) {
    console.error('sync-to-google-calendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// All-day event for a deadline; Google end date is exclusive (day after)
function buildDeadlineEvent(title, dueDate, description) {
  const d = new Date(dueDate);
  const startStr = d.toISOString().split('T')[0];
  const end = new Date(d);
  end.setDate(end.getDate() + 1);
  const endStr = end.toISOString().split('T')[0];
  return {
    summary: title,
    description: description || '',
    start: { date: startStr },
    end: { date: endStr },
  };
}