import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ThankYou() {
  const [status, setStatus] = useState('pending'); // pending | active
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Poll for subscription activation (webhook may arrive shortly after redirect)
    const poll = async () => {
      try {
        const user = await base44.auth.me();
        const subs = await base44.entities.Subscription.filter({ user_email: user.email });
        const active = subs.find(s => s.status === 'active');
        if (active) {
          setStatus('active');
          return;
        }
      } catch (e) { /* ignore */ }
      setAttempts(a => a + 1);
    };

    poll();
    const interval = setInterval(() => {
      setAttempts(a => {
        if (a >= 10) { clearInterval(interval); return a; }
        return a;
      });
      poll();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mb-6"
      >
        <CheckCircle className="w-20 h-20 text-accent mx-auto" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 className="text-3xl font-bold mb-3">
          {status === 'active' ? 'You\'re all set! 🎉' : 'Payment received!'}
        </h1>
        <p className="text-muted-foreground mb-2 max-w-md">
          {status === 'active'
            ? 'Your Syllabist Pro subscription is now active. Start using all premium features right away.'
            : 'We\'re confirming your payment. This usually takes just a few seconds…'}
        </p>

        {status === 'pending' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Activating your subscription…
          </div>
        )}

        {status === 'active' && (
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/"><Button>Go to AI Tutor</Button></Link>
            <Link to="/dashboard"><Button variant="outline">Dashboard</Button></Link>
          </div>
        )}

        {status === 'pending' && attempts >= 10 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">Taking longer than expected? Your access will be activated shortly.</p>
            <Link to="/"><Button variant="outline">Go to App</Button></Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}