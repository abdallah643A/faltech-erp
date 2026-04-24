import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tags, Plus, X, Sparkles, Filter, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Lead } from '@/hooks/useLeads';

interface CustomerTagsManagerProps {
  leads: Lead[];
  onFilterByTag?: (tag: string | null) => void;
  onFilterBySegment?: (segment: string | null) => void;
}

const tagColorMap: Record<string, string> = {
  gold: 'bg-amber-100 text-amber-800 border-amber-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  gray: 'bg-gray-100 text-gray-800 border-gray-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  teal: 'bg-teal-100 text-teal-800 border-teal-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
};

export function CustomerTagsManager({ leads, onFilterByTag, onFilterBySegment }: CustomerTagsManagerProps) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');
  const [newTagCategory, setNewTagCategory] = useState('general');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const { data: tags = [] } = useQuery({
    queryKey: ['customer-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_tags').select('*').order('category', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_segments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createTag = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customer_tags').insert({
        name: newTagName, color: newTagColor, category: newTagCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      setIsAddTagOpen(false);
      setNewTagName('');
      toast({ title: 'Tag Created' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const addTagToLead = async (leadId: string, tagName: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currentTags: string[] = (lead as any).tags || [];
    if (currentTags.includes(tagName)) return;
    const { error } = await supabase.from('business_partners').update({
      tags: [...currentTags, tagName],
    }).eq('id', leadId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
    }
  };

  const removeTagFromLead = async (leadId: string, tagName: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currentTags: string[] = (lead as any).tags || [];
    const { error } = await supabase.from('business_partners').update({
      tags: currentTags.filter(t => t !== tagName),
    }).eq('id', leadId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
    }
  };

  const handleTagFilter = (tag: string) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    setActiveSegment(null);
    onFilterByTag?.(next);
  };

  const handleSegmentFilter = (segmentName: string) => {
    const next = activeSegment === segmentName ? null : segmentName;
    setActiveSegment(next);
    setActiveTag(null);
    onFilterBySegment?.(next);
  };

  // Count tags across leads
  const tagCounts: Record<string, number> = {};
  leads.forEach(lead => {
    ((lead as any).tags || []).forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  // Group tags by category
  const tagsByCategory: Record<string, typeof tags> = {};
  tags.forEach(tag => {
    const cat = tag.category || 'general';
    if (!tagsByCategory[cat]) tagsByCategory[cat] = [];
    tagsByCategory[cat].push(tag);
  });

  return (
    <div className="space-y-4">
      {/* Tags Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              {language === 'ar' ? 'العلامات والتصنيفات' : 'Tags & Segments'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsAddTagOpen(true)} className="gap-1">
              <Plus className="h-3 w-3" /> Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
            <div key={category}>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {categoryTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagFilter(tag.name)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer
                      ${activeTag === tag.name ? 'ring-2 ring-primary ring-offset-1' : ''}
                      ${tagColorMap[tag.color || 'blue'] || tagColorMap.blue}`}
                  >
                    <Hash className="h-2.5 w-2.5" />
                    {tag.name}
                    {tagCounts[tag.name] ? <span className="ml-0.5 opacity-60">({tagCounts[tag.name]})</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Smart Segments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Smart Segments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {segments.map(segment => {
            const conditions = segment.conditions as any;
            let count = leads.length;
            if (conditions?.min_score) count = leads.filter(l => ((l as any).score || l.score || 0) >= conditions.min_score).length;
            if (conditions?.max_score) count = leads.filter(l => ((l as any).score || l.score || 0) <= conditions.max_score).length;
            if (conditions?.min_score && conditions?.max_score) {
              count = leads.filter(l => {
                const s = (l as any).score || l.score || 0;
                return s >= conditions.min_score && s <= conditions.max_score;
              }).length;
            }
            if (conditions?.risk_level) count = leads.filter(l => (l as any).risk_level === conditions.risk_level).length;

            return (
              <button
                key={segment.id}
                onClick={() => handleSegmentFilter(segment.name)}
                className={`w-full flex items-center justify-between p-2 rounded-md border text-left transition-all hover:bg-muted/50
                  ${activeSegment === segment.name ? 'ring-2 ring-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    segment.color === 'red' ? 'bg-red-500' :
                    segment.color === 'amber' ? 'bg-amber-500' :
                    segment.color === 'blue' ? 'bg-blue-500' :
                    segment.color === 'emerald' ? 'bg-emerald-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-sm font-medium">{segment.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{count}</Badge>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Inline Tag Assignment for leads */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Tag Assignment</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[300px] overflow-y-auto space-y-2">
          {leads.slice(0, 10).map(lead => {
            const leadTags: string[] = (lead as any).tags || [];
            return (
              <div key={lead.id} className="flex items-center gap-2 p-2 rounded border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{lead.card_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {leadTags.map(t => {
                      const tagDef = tags.find(tag => tag.name === t);
                      return (
                        <span key={t} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[10px] border ${tagColorMap[tagDef?.color || 'blue'] || tagColorMap.blue}`}>
                          {t}
                          <button onClick={() => removeTagFromLead(lead.id, t)} className="ml-0.5 hover:text-red-600">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <Select onValueChange={(v) => addTagToLead(lead.id, v)}>
                  <SelectTrigger className="w-20 h-6 text-[10px]">
                    <SelectValue placeholder="+ Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.filter(t => !leadTags.includes(t.name)).map(t => (
                      <SelectItem key={t.id} value={t.name} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Tag Dialog */}
      <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="e.g. Priority Client" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <Select value={newTagColor} onValueChange={setNewTagColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(tagColorMap).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="tier">Tier</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="lifecycle">Lifecycle</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createTag.mutate()} disabled={!newTagName.trim()}>Create Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
