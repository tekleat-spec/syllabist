import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both authenticated user calls and automation (service role) calls
  let userId = null;
  try {
    const user = await base44.auth.me();
    userId = user?.id;
  } catch (_) {
    // Running as automation — proceed with service role
  }

  const db = userId ? base44 : base44.asServiceRole;

  // Fetch all assignments, calendar events, and courses
  const [assignments, calendarEvents, courses] = await Promise.all([
    db.entities.Assignment.list(),
    db.entities.CalendarEvent.list(),
    db.entities.Course.list(),
  ]);

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

  // Index existing deadline events by assignment_id
  const eventByAssignment = {};
  for (const ev of calendarEvents) {
    if (ev.assignment_id) {
      eventByAssignment[ev.assignment_id] = ev;
    }
  }

  const created = [];
  const updated = [];
  const skipped = [];

  for (const assignment of assignments) {
    if (!assignment.due_date) {
      skipped.push(assignment.id);
      continue;
    }

    const course = courseMap[assignment.course_id];
    const title = course
      ? `[${course.name}] ${assignment.title}`
      : assignment.title;

    const existing = eventByAssignment[assignment.id];

    if (!existing) {
      // Create new calendar event
      await db.entities.CalendarEvent.create({
        title,
        assignment_id: assignment.id,
        course_id: assignment.course_id || undefined,
        event_type: 'deadline',
        start_date: assignment.due_date,
        end_date: assignment.due_date,
        description: assignment.description || '',
      });
      created.push(assignment.id);
    } else {
      // Check if update needed
      const needsUpdate =
        existing.title !== title ||
        existing.start_date !== assignment.due_date ||
        existing.end_date !== assignment.due_date;

      if (needsUpdate) {
        await db.entities.CalendarEvent.update(existing.id, {
          title,
          start_date: assignment.due_date,
          end_date: assignment.due_date,
        });
        updated.push(assignment.id);
      } else {
        skipped.push(assignment.id);
      }
    }
  }

  // Remove stale deadline events for assignments that no longer exist
  const assignmentIds = new Set(assignments.map(a => a.id));
  const stale = calendarEvents.filter(
    ev => ev.event_type === 'deadline' && ev.assignment_id && !assignmentIds.has(ev.assignment_id)
  );
  for (const ev of stale) {
    await db.entities.CalendarEvent.delete(ev.id);
  }

  return Response.json({
    success: true,
    created: created.length,
    updated: updated.length,
    skipped: skipped.length,
    staleRemoved: stale.length,
  });
});