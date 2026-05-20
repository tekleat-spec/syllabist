import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Zap, Star, Loader2, Upload, Brain, Calendar, BookOpen, TrendingUp, MessageSquare, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const TESTIMONIALS = [
  { name: "Maya R.", school: "University of Michigan", quote: "I uploaded my syllabus and Syllabist instantly organized all my deadlines. I went from panic mode to actually feeling prepared.", grade: "Pre-Med Junior" },
  { name: "Jordan T.", school: "Michigan State", quote: "The AI tutor explained a concept my professor couldn't in 3 lectures. Worth every penny during finals week.", grade: "CS Sophomore" },
  { name: "Priya S.", school: "Wayne State", quote: "I used to pull all-nighters just to keep up. Now I have a study schedule that actually fits my life.", grade: "Business Senior" },
];

const FREE_FEATURES = [
  "3 courses",
  "5 document uploads",
  "Basic AI Tutor (limited messages)",
  "Assignment tracker",
];

const PRO_FEATURES = [
  { icon: Upload, text: "Unlimited syllabus & document uploads" },
  { icon: Brain, text: "Unlimited AI Tutor — ask anything, anytime" },
  { icon: Calendar, text: "Smart study scheduler & deadline alerts" },
  { icon: BookOpen, text: "Assignment Workshop — AI-generated drafts" },
  { icon: MessageSquare, text: "Document Q&A — chat with your PDFs" },
  { icon: TrendingUp, text: "Grade tracker & performance analytics" },
];

export default function Pricing() {
  const [loading, setLoading] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => { checkSubscription(); }, []);

  const checkSubscription = async () => {
    try {
      const isAuthed = await base44.auth.isAuthenticated();
      if (!isAuthed) { setChecking(false); return; }
      const user = await base44.auth.me();
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      const active = subs.find(s => s.status === 'active');
      setSubscription(active || null);
    } catch (e) {}
    setChecking(false);
  };

  const handleSubscribe = async (plan) => {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) { base44.auth.redirectToLogin(window.location.href); return; }
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
    <div className="max-w-4xl mx-auto px-4 py-10 pb-20">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Trusted by students at 50+ universities
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Stop Surviving.<br />
          <span className="text-amber-500">Start Thriving.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Upload your syllabus once. Syllabist handles the rest — deadlines, study plans, AI tutoring, and more. Less anxiety, better grades.
        </p>
        {subscription && (
          <Badge className="mt-5 bg-green-100 text-green-700 border-green-200 px-4 py-1.5 text-sm font-medium">
            ✓ You're on the {subscription.plan === 'annual' ? 'Annual' : 'Monthly'} Pro plan — you're all set!
          </Badge>
        )}
      </motion.div>

      {/* How it works in 3 steps */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-10 bg-amber-50 rounded-2xl p-6 border border-amber-100">
        {[
          { step: "1", icon: "📄", title: "Upload your syllabus", desc: "30 seconds" },
          { step: "2", icon: "✨", title: "AI organizes everything", desc: "Deadlines, assignments, study plan" },
          { step: "3", icon: "🎓", title: "Ace your semester", desc: "With your AI study partner" },
        ].map(s => (
          <div key={s.step} className="text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <p className="font-semibold text-sm">{s.title}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">

        {/* Free */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-8 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-muted-foreground mb-1">Free</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/forever</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Try it out, no credit card needed</p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-8">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-muted-foreground/50 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/dashboard'}>
            Continue Free
          </Button>
        </motion.div>

        {/* Pro Annual */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-white p-8 flex flex-col relative shadow-lg shadow-amber-100">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full shadow">MOST POPULAR · 14-DAY FREE TRIAL</span>
          </div>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <h2 className="text-lg font-bold">Pro Annual</h2>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$79.99</span>
              <span className="text-muted-foreground">/year</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Just $6.67/mo · <span className="text-green-600 font-medium">Save 33% vs $9.99/mo monthly</span></p>
          </div>
          <ul className="space-y-2.5 flex-1 mb-8">
            {PRO_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm font-medium">
                <Icon className="w-4 h-4 text-amber-500 shrink-0" /> {text}
              </li>
            ))}
          </ul>
          <Button
            className="w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold text-base h-12 shadow-md shadow-amber-200"
            disabled={!!loading || !!subscription}
            onClick={() => handleSubscribe('annual')}
          >
            {loading === 'annual' ? <Loader2 className="w-4 h-4 animate-spin" /> :
              subscription ? '✓ Already Subscribed' : <>Start Free Trial <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">14 days free · cancel anytime · no stress</p>
        </motion.div>
      </div>

      {/* Monthly option */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-center mb-10">
        <p className="text-sm text-muted-foreground mb-2">Prefer month-to-month?</p>
        <Button variant="outline" size="sm" disabled={!!loading || !!subscription} onClick={() => handleSubscribe('monthly')}
          className="border-amber-200 text-amber-700 hover:bg-amber-50">
          {loading === 'monthly' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Monthly Plan — $9.99/mo'}
        </Button>
      </motion.div>

      {/* Testimonials */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="mb-10">
        <h3 className="text-center font-bold text-lg mb-5">Students who stopped stressing 👇</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
              <p className="text-sm leading-relaxed mb-4 text-foreground/80">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.grade} · {t.school}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trust footer */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure checkout</span>
        <span>•</span>
        <span>Cancel anytime, no hassle</span>
        <span>•</span>
        <span>Powered by Base44 Payments</span>
      </div>
    </div>
  );
}