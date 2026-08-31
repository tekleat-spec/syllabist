import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const CONNECTOR_ID = '6a94fea443cf927a65b7f66d';

export default function GoogleCalendarCard() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('sync-to-google-calendar', { mode: 'full' });
      setConnected(true);
      setSyncResult(res.data);
    } catch {
      setConnected(false);
      setSyncResult(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) await checkConnection();
      else setLoading(false);
    });
  }, [checkConnection]);

  const handleConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkConnection();
        }
      }, 500);
    } catch (e) {
      console.error('Connect failed', e);
    }
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setSyncResult(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('sync-to-google-calendar', { mode: 'full' });
      setConnected(true);
      setSyncResult(res.data);
    } catch (e) {
      setSyncResult({ error: e.message });
    }
    setSyncing(false);
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking Google Calendar…</span>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Google Calendar</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {connected
                ? 'Connected — assignment deadlines and study sessions auto-sync to your calendar.'
                : 'Connect to push your assignment deadlines and study sessions to your personal calendar.'}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {connected ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <XCircle className="w-4 h-4" /> Not connected
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {connected ? (
          <>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync now
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground">
              Disconnect
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleConnect}>
            <Calendar className="w-4 h-4 mr-2" />
            Connect Google Calendar
          </Button>
        )}
      </div>

      {syncResult && !syncResult.error && (
        <p className="text-xs text-muted-foreground mt-3">
          Synced: {syncResult.created || 0} created · {syncResult.updated || 0} updated · {syncResult.deleted || 0} removed
          {syncResult.errors?.length > 0 && ` · ${syncResult.errors.length} errors`}
        </p>
      )}
      {syncResult?.error && (
        <p className="text-xs text-destructive mt-3">{syncResult.error}</p>
      )}
    </Card>
  );
}