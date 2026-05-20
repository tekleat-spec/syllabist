import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Delete all user data
    const [courses, assignments, documents, subscriptions] = await Promise.all([
      base44.entities.Course.filter({}),
      base44.entities.Assignment.filter({}),
      base44.entities.Document.filter({}),
      base44.entities.Subscription.filter({ user_email: user.email }),
    ]);

    await Promise.all([
      ...courses.map(e => base44.entities.Course.delete(e.id)),
      ...assignments.map(e => base44.entities.Assignment.delete(e.id)),
      ...documents.map(e => base44.entities.Document.delete(e.id)),
      ...subscriptions.map(e => base44.entities.Subscription.delete(e.id)),
    ]);

    console.log(`Account data deleted for: ${user.email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});