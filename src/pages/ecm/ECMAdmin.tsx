import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings, Users, Shield, Building2, Key, Bell, Database,
  Upload, Edit, Plus, Lock, Eye, FileText, HardDrive, Loader2
} from "lucide-react";

const DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Procurement', 'Projects', 'Sales', 'Production', 'Administration', 'IT'];

const ECMAdmin = () => {
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['ecm-admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email, department, status');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['ecm-admin-docs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_documents').select('id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['ecm-admin-folders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_folders').select('id');
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[#0066cc]" />
        <div>
          <h1 className="text-xl font-bold">ECM Administration</h1>
          <p className="text-sm text-muted-foreground">System configuration and user management</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{users.length}</p><p className="text-xs text-muted-foreground">Users</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{docs.length}</p><p className="text-xs text-muted-foreground">Documents</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{folders.length}</p><p className="text-xs text-muted-foreground">Folders</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{DEPARTMENTS.length}</p><p className="text-xs text-muted-foreground">Departments</p></CardContent></Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
          <TabsTrigger value="numbering">Auto Numbering</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u: any) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium text-sm">{u.full_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{u.department || '-'}</Badge></TableCell>
                        <TableCell>
                          <Badge className={u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {u.status || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">RBAC Permission Matrix</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Manager</TableHead>
                    <TableHead className="text-center">User</TableHead>
                    <TableHead className="text-center">Viewer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['Documents', 'Correspondence', 'Workflows', 'Signatures', 'Reports', 'Admin'].map(mod => (
                    <TableRow key={mod}>
                      <TableCell className="font-medium text-sm">{mod}</TableCell>
                      {['admin', 'manager', 'user', 'viewer'].map(role => (
                        <TableCell key={role} className="text-center">
                          <Switch defaultChecked={role === 'admin' || (role === 'manager' && mod !== 'Admin')} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Document Retention Policies</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: 'Contracts', period: '10 years', action: 'Archive' },
                { type: 'Invoices', period: '7 years', action: 'Archive' },
                { type: 'HR Documents', period: '5 years', action: 'Delete' },
                { type: 'Correspondence', period: '3 years', action: 'Archive' },
                { type: 'Internal Memos', period: '1 year', action: 'Delete' },
              ].map((pol, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-[#0066cc]" />
                    <div>
                      <p className="text-sm font-medium">{pol.type}</p>
                      <p className="text-xs text-muted-foreground">Retain for {pol.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{pol.action}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbering" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Auto Numbering Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: 'Incoming Correspondence', pattern: 'IN-{YYYY}-{NNNNN}', next: 'IN-2025-00001' },
                { type: 'Outgoing Correspondence', pattern: 'OUT-{YYYY}-{NNNNN}', next: 'OUT-2025-00001' },
                { type: 'Internal Memo', pattern: 'MEM-{YYYY}-{NNN}', next: 'MEM-2025-001' },
                { type: 'Document Reference', pattern: '{DEPT}-{YYYY}-{NNNN}', next: 'FIN-2025-0001' },
              ].map((cfg, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{cfg.type}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cfg.pattern}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Next:</p>
                      <p className="text-sm font-mono">{cfg.next}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ECMAdmin;