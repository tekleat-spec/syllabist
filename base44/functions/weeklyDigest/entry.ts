import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all data
    const [assignments, courses, documents] = await Promise.all([
      base44.asServiceRole.entities.Assignment.list('-due_date'),
      base44.asServiceRole.entities.Course.list(),
      base44.asServiceRole.entities.Document.list('-created_date'),
    ]);

    // Find assignments due this week (Mon–Sun)
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const dueThisWeek = assignments.filter(a => {
      if (!a.due_date) return false;
      const d = new Date(a.due_date.includes('T') ? a.due_date : a.due_date + 'T12:00:00');
      return d >= monday && d <= sunday;
    });

    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    // Get recent documents for context on what's being covered
    const recentDocs = documents.slice(0, 5).map(d => {
      const course = courseMap[d.course_id];
      return `- ${d.title}${course ? ` (${course.name})` : ''}${d.content_summary ? ': ' + d.content_summary.slice(0, 150) : ''}`;
    }).join('\n');

    // Build due dates context
    const dueContext = dueThisWeek.length > 0
      ? dueThisWeek.map(a => {
          const course = courseMap[a.course_id];
          const d = new Date(a.due_date.includes('T') ? a.due_date : a.due_date + 'T12:00:00');
          const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          return `- ${a.title} (${course?.name || 'Unknown'}) — due ${dayName}${a.weight ? `, worth ${a.weight}%` : ''}`;
        }).join('\n')
      : 'No assignments due this week — a great time to get ahead!';

    // Generate email content with AI + web search for motivational quote
    const emailContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a supportive academic coach writing a weekly Monday morning digest email for a college student.

Today is Monday, ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

ASSIGNMENTS DUE THIS WEEK:
${dueContext}

RECENT COURSE MATERIALS (what's being covered):
${recentDocs || 'No recent documents uploaded.'}

Write a warm, motivating weekly digest email in clean HTML with:
1. A friendly greeting opening
2. A "This Week's Deadlines" section listing each due assignment with its course and day
3. A "What You're Covering" section briefly summarizing the course material topics
4. A motivational quote or message about perseverance, staying focused, pushing through, and achieving academic goals — search your knowledge for a powerful, relevant quote from a well-known figure or an original motivational message
5. A warm closing sign-off

Style: encouraging, concise, student-focused. Use simple HTML with inline styles — a clean white card layout, dark headings, colored accent for deadlines (#6366f1 indigo). No external CSS frameworks. Make it look great in an email client.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'tekleat@gmail.com',
      subject: `📚 Your Week Ahead — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      body: emailContent,
      from_name: 'StudyBuddy',
    });

    return Response.json({ success: true, assignments_this_week: dueThisWeek.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});