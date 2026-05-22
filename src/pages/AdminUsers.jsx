import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Crown, User, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { format } from 'date-fns';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin',
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
    enabled: currentUser?.role === 'admin',
  });

  const tierMutation = useMutation({
    mutationFn: ({ userId, tier }) => base44.entities.User.update(userId, { access_tier: tier }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">Admin access required.</p>
      </div>
    );
  }

  const getActiveSub = (email) => subscriptions.find(s => s.user_email === email && s.status === 'active');

  const isPro = (user) => user.access_tier === 'pro' || !!getActiveSub(user.email);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} registered users`}
        actions={
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-subscriptions'] })}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {users.map(user => {
            const sub = getActiveSub(user.email);
            const pro = isPro(user);
            const isMe = user.email === currentUser.email;

            return (
              <Card key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {user.role === 'admin' ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{user.full_name || 'No name'}</p>
                      {isMe && <Badge variant="outline" className="text-[10px]">You</Badge>}
                      {user.role === 'admin' && <Badge className="text-[10px] bg-primary/10 text-primary border-0">Admin</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Joined {format(new Date(user.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Subscription status */}
                  <div className="text-right">
                    {pro ? (
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">
                          {user.access_tier === 'pro' ? 'Pro (granted)' : `Pro (${sub?.plan})`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Free</span>
                    )}
                  </div>

                  {/* Toggle button — don't allow changing your own or other admins */}
                  {!isMe && user.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant={pro && user.access_tier === 'pro' ? 'destructive' : 'default'}
                      className="text-xs h-8"
                      disabled={tierMutation.isPending}
                      onClick={() => tierMutation.mutate({
                        userId: user.id,
                        tier: user.access_tier === 'pro' ? 'free' : 'pro',
                      })}
                    >
                      {tierMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                        user.access_tier === 'pro' ? 'Revoke Pro' : 'Grant Pro'
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}