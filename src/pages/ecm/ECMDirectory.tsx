import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Search, Building2, Mail, Phone, MapPin, Loader2, UserPlus
} from "lucide-react";

const ECMDirectory = () => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['ecm-directory-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email, department, status');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bps = [] } = useQuery({
    queryKey: ['ecm-directory-bps'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_partners').select('id, card_name, card_type, phone, email, city');
      if (error) throw error;
      return (data || []).slice(0, 50);
    },
  });

  const departments = [...new Set(profiles.map((p: any) => p.department).filter(Boolean))];

  const filteredUsers = profiles.filter((p: any) => {
    if (deptFilter !== 'all' && p.department !== deptFilter) return false;
    if (!search) return true;
    return (p.full_name || '').toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase());
  });

  const filteredOrgs = bps.filter((b: any) => !search || (b.card_name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[#0066cc]" />
          <div>
            <h1 className="text-xl font-bold">Directory</h1>
            <p className="text-sm text-muted-foreground">Internal users and external contacts</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search directory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d as string}>{d as string}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="internal">
        <TabsList>
          <TabsTrigger value="internal">Internal Users ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="external">External Contacts ({filteredOrgs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user: any) => (
                <Card key={user.user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#0066cc] text-white text-sm">
                          {(user.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user.full_name || 'Unknown'}</p>
                        {user.department && <Badge variant="outline" className="text-[10px] mt-0.5">{user.department}</Badge>}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No external contacts found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrgs.map((org: any) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{org.card_name}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{org.card_type === 'C' ? 'Customer' : org.card_type === 'S' ? 'Vendor' : 'Lead'}</Badge>
                        <div className="mt-2 space-y-1">
                          {org.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {org.email}</div>}
                          {org.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {org.phone}</div>}
                          {org.city && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {org.city}</div>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ECMDirectory;