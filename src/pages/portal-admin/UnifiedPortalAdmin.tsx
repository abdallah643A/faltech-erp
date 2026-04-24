import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalUsers, usePortalInvitations, usePortalRoles, PortalType } from '@/hooks/useUnifiedPortal';
import { Mail, Plus, Users, Shield, Trash2 } from 'lucide-react';

const PORTAL_TYPES: PortalType[] = ['client', 'supplier', 'subcontractor', 'saas_admin'];

export default function UnifiedPortalAdmin() {
  const [portalType, setPortalType] = useState<PortalType>('client');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const { data: users = [] } = usePortalUsers(portalType);
  const invitations = usePortalInvitations(portalType);
  const roles = usePortalRoles(portalType);

  const submitInvite = () => {
    if (!inviteEmail) return;
    invitations.create.mutate({ email: inviteEmail, full_name: inviteName, portal_type: portalType }, {
      onSuccess: () => { setInviteOpen(false); setInviteEmail(''); setInviteName(''); },
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unified Portal Administration</h1>
          <p className="text-sm text-muted-foreground">Manage clients, suppliers, subcontractors, and SaaS admins from one place.</p>
        </div>
        <Select value={portalType} onValueChange={(v) => setPortalType(v as PortalType)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PORTAL_TYPES.map((p) => <SelectItem key={p} value={p}>{p.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="invitations"><Mail className="h-4 w-4 mr-2" />Invitations</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-2" />Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>Active members ({users.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.full_name || '—'}</TableCell>
                      <TableCell><Badge variant={u.status === 'active' ? 'default' : 'secondary'}>{u.status}</Badge></TableCell>
                      <TableCell>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No members yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invitations ({invitations.data?.length ?? 0})</CardTitle>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Invite</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite to {portalType} portal</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Email</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
                    <div><Label>Full name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} /></div>
                    <Button className="w-full" onClick={submitInvite} disabled={!inviteEmail || invitations.create.isPending}>Send invitation</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {invitations.data?.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.email}</TableCell>
                      <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                      <TableCell>{new Date(i.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell>{i.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => invitations.revoke.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                  {(!invitations.data || invitations.data.length === 0) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No invitations yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Roles ({roles.data?.length ?? 0})</CardTitle>
              <Button size="sm" onClick={() => roles.upsert.mutate({ portal_type: portalType, role_name: `New role ${(roles.data?.length ?? 0) + 1}`, permissions: {} })}>
                <Plus className="h-4 w-4 mr-2" />New role
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Permissions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {roles.data?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.role_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.description || '—'}</TableCell>
                      <TableCell><code className="text-xs">{Object.keys(r.permissions || {}).length} keys</code></TableCell>
                    </TableRow>
                  ))}
                  {(!roles.data || roles.data.length === 0) && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No custom roles defined</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
