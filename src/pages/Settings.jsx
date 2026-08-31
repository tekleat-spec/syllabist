import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import GoogleCalendarCard from '@/components/settings/GoogleCalendarCard';

export default function Settings() {
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await base44.functions.invoke('deleteAccount', {});
    base44.auth.logout('/');
  };

  const handleLogout = () => base44.auth.logout('/');

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" subtitle="Manage your account" />

      <div className="space-y-4">
        <GoogleCalendarCard />

        {/* Logout */}
        <Card className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Sign Out</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Sign out of your Syllabist account</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </Card>

        {/* Delete Account */}
        <Card className="p-6 flex items-center justify-between border-destructive/30">
          <div>
            <h3 className="font-semibold text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Permanently delete your account and all data</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, all courses, assignments, documents, and data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={handleDeleteAccount}
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    </div>
  );
}