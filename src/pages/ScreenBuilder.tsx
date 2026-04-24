import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScreenBuilderRenderer } from '@/components/metadata/ScreenBuilderRenderer';
import { Search, Database, Table2, Layers, Eye, Settings, Loader2 } from 'lucide-react';

export default function ScreenBuilder() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('entities');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['screen-builder-entities'],
    queryFn: async () => {
      const { data } = await supabase.from('metadata_entities').select('*').eq('status', 'published').order('display_name');
      return data || [];
    },
  });

  const filtered = entities.filter((e: any) =>
    !search || e.display_name.toLowerCase().includes(search.toLowerCase()) || e.technical_name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedEntityId) {
    const entity = entities.find((e: any) => e.id === selectedEntityId);
    return (
      <div className="space-y-4 page-enter">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEntityId(null)}>← Back</Button>
          <h1 className="text-xl font-bold">{entity?.display_name || 'Custom Entity'}</h1>
          <Badge variant="outline">{entity?.technical_name}</Badge>
        </div>
        <ScreenBuilderRenderer entityId={selectedEntityId} entityName={entity?.display_name} tableName={entity?.technical_name} />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'منشئ الشاشات' : 'Screen Builder'}</h1>
        <p className="text-muted-foreground">{isAr ? 'شاشات CRUD مُولّدة تلقائياً من الكيانات المخصصة' : 'Auto-generated CRUD screens from published custom entities'}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entities" className="gap-1.5 text-xs"><Database className="h-3.5 w-3.5" />Published Entities</TabsTrigger>
          <TabsTrigger value="screens" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" />Screen Configs</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search entities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Table2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No published entities</p>
                <p className="text-sm mt-1">Create and publish entities in Metadata Studio first</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => window.location.href = '/metadata-studio'}>
                  Go to Metadata Studio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((entity: any) => (
                <Card key={entity.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEntityId(entity.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{entity.display_name}</CardTitle>
                      <Badge variant="default" className="text-[10px]">v{entity.version}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{entity.technical_name}</code>
                      {entity.description && <p className="text-xs text-muted-foreground line-clamp-2">{entity.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        {entity.audit_enabled && <Badge variant="outline" className="text-[10px]">Audit</Badge>}
                        {entity.attachments_enabled && <Badge variant="outline" className="text-[10px]">Attachments</Badge>}
                        {entity.workflow_ready && <Badge variant="outline" className="text-[10px]">Workflow</Badge>}
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-2">
                        <Eye className="h-3.5 w-3.5 mr-1" />Open CRUD Screen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="screens" className="space-y-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Screen configuration allows you to customize form layouts, grid columns, tab groupings, and conditional visibility for each entity.</p>
              <p className="text-sm mt-2">Select an entity above to auto-generate its CRUD screen, then customize from here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
