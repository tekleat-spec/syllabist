import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Zap, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const FEATURES = [
  "AI Tutor — unlimited Q&A on your courses",
  "Study Scheduler with personalized plans",
  "Assignment Workshop — AI-generated drafts",
  "Document Q&A — chat with your PDFs",
  "Research Assistant",
  "Calendar sync & deadline alerts",
  "Grade tracker & analytics",
  "Unlimited course uploads",
];

export default function Pricing() {
  const [loading, setLoading] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const isAuthed = await base44.auth.isAuthenticated();
      if (!isAuthed) { setChecking(false); return; }
      const user = await base44.auth.me();
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      const active = subs.find(s => s.status === 'active');
      setSubscription(active || null);
    } catch (e) {
      // not logged in or no sub
    }
    setChecking(false);
  };

  const handleSubscribe = async (plan) => {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setLoading(plan);
    try {
      const res = await base44.functions.invoke('createCheckout', { plan });
      window.location.href = res.data.redirectUrl;
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Upgrade to Syllabist Pro</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Your AI-powered academic co-pilot. Ace your semester with smarter study tools.
        </p>
        {subscription && (
          <Badge className="mt-4 bg-accent text-accent-foreground px-4 py-1.5 text-sm">
            ✓ You're on the {subscription.plan === 'annual' ? 'Annual' : 'Monthly'} Pro plan
          </Badge>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 h-full flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Monthly</h2>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Cancel anytime</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant="outline"
              disabled={!!loading || !!subscription}
              onClick={() => handleSubscribe('monthly')}
            >
              {loading === 'monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : subscription ? 'Already Subscribed' : 'Get Started'}
            </Button>
          </Card>
        </motion.div>

        {/* Annual */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-8 h-full flex flex-col border-primary shadow-lg relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Annual</h2>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$79.99</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-accent font-medium mt-2">14-day free trial • Save 33%</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              disabled={!!loading || !!subscription}
              onClick={() => handleSubscribe('annual')}
            >
              {loading === 'annual' ? <Loader2 className="w-4 h-4 animate-spin" /> : subscription ? 'Already Subscribed' : 'Start Free Trial'}
            </Button>
          </Card>
        </motion.div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Secure checkout powered by Base44 Payments. Cancel anytime from your account settings.
      </p>
    </div>
  );
}