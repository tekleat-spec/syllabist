import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [assignments, courses, documents] = await Promise.all([
      base44.asServiceRole.entities.Assignment.list('-due_date'),
      base44.asServiceRole.entities.Course.list(),
      base44.asServiceRole.entities.Document.list('-created_date'),
    ]);

    // Sunday morning: compute the upcoming week (Mon–Sun)
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const parseDate = (s: string) => new Date(s && s.includes('T') ? s : s + 'T12:00:00');

    const courseMap = Object.fromEntries(courses.map((c: any) => [c.id, c]));

    // Assignments due this week, grouped by course
    const dueThisWeek = assignments.filter((a: any) => {
      if (!a.due_date) return false;
      const d = parseDate(a.due_date);
      return d >= monday && d <= sunday;
    });

    const byCourse: Record<string, any[]> = {};
    dueThisWeek.forEach((a: any) => {
      const cname = courseMap[a.course_id]?.name || 'Other';
      if (!byCourse[cname]) byCourse[cname] = [];
      byCourse[cname].push(a);
    });

    // Readings/materials grouped by course
    const readingsByCourse: Record<string, any[]> = {};
    documents.forEach((d: any) => {
      const cname = d.course_id ? (courseMap[d.course_id]?.name || 'Other') : null;
      if (!cname) return;
      if (!readingsByCourse[cname]) readingsByCourse[cname] = [];
      readingsByCourse[cname].push(d);
    });

    // Build per-class summary
    const allCourseNames = Array.from(new Set([...Object.keys(byCourse), ...Object.keys(readingsByCourse)]));
    const classSections = allCourseNames.map((cname) => {
      const dues = (byCourse[cname] || []).map((a) => {
        const d = parseDate(a.due_date);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        return `  • ${a.title} — due ${dayName}${a.weight ? ` (${a.weight}%)` : ''}`;
      }).join('\n');
      const readings = (readingsByCourse[cname] || []).slice(0, 4).map((d) =>
        `  • ${d.title}${d.content_summary ? ': ' + d.content_summary.slice(0, 120) : ''}`
      ).join('\n');
      return `### ${cname}\nDEADLINES:\n${dues || '  • Nothing due this week'}\nREADINGS & MATERIALS:\n${readings || '  • No recent materials'}`;
    }).join('\n\n');

    const emailContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a supportive academic coach writing a weekly Sunday morning report email for a college student, previewing the week ahead.

Today is Sunday, ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

Here is the student's upcoming week organized by class. For each class, DEADLINES lists assignments/exams due this week with their due dates, and READINGS & MATERIALS lists recently uploaded course materials.

${classSections || 'No classes or assignments found.'}

Write a warm, motivating weekly Sunday report email in clean HTML with:
1. A friendly Sunday greeting opening
2. A "This Week Ahead" section organized by class — for each class, list upcoming deadlines and readings/materials
3. A motivational quote or message about perseverance, focus, and achieving academic goals
4. A warm closing sign-off

Style: encouraging, concise, student-focused. Use simple HTML with inline styles — a clean white card layout, dark headings, colored accent for deadlines (#6366f1 indigo). No external CSS frameworks. Make it look great in an email client.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'teklea@mail.gvsu.edu',
      subject: `📚 Your Week Ahead — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      body: emailContent,
      from_name: 'StudyBuddy',
    });

    return Response.json({ success: true, assignments_this_week: dueThisWeek.length, courses: allCourseNames.length });
  } catch (error) {
    console.error('weeklyDigest error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});