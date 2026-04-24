import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useHandbookArticles } from '@/hooks/useCompliance';
import { BookOpen, Plus, Search, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const HANDBOOK_CATEGORIES = [
  'company_overview', 'employment', 'compensation', 'benefits', 'time_off',
  'conduct', 'safety', 'it_policy', 'remote_work', 'general',
];

export default function EmployeeHandbook() {
  const { t } = useLanguage();
  const { articles, isLoading, createArticle } = useHandbookArticles();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', category: 'general', content: '', summary: '', is_published: true,
  });

  const filteredArticles = useMemo(() => {
    return articles.filter((a: any) => {
      const matchesSearch = !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.content?.toLowerCase().includes(search.toLowerCase()) ||
        a.summary?.toLowerCase().includes(search.toLowerCase()) ||
        a.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, search, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((a: any) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [articles]);

  const currentArticle = articles.find((a: any) => a.id === selectedArticle);

  const handleCreate = () => {
    createArticle.mutate({
      title: form.title,
      category: form.category,
      content: form.content,
      summary: form.summary || undefined,
      is_published: form.is_published,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ title: '', category: 'general', content: '', summary: '', is_published: true });
      },
    });
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Employee Handbook</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Company policies, guidelines, and resources</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Handbook Article</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HANDBOOK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Summary</Label>
                <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Brief summary..." />
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="min-h-[250px]" placeholder="Article content..." />
              </div>
              <Button onClick={handleCreate} disabled={!form.title || !form.content || createArticle.isPending} className="w-full">
                {createArticle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Publish Article
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search handbook articles..."
          className="pl-10 h-11"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => setSelectedCategory('all')}
                >
                  <span>All Articles</span>
                  <Badge variant="secondary" className="text-xs">{articles.length}</Badge>
                </Button>
                {HANDBOOK_CATEGORIES.filter(c => categoryCounts[c]).map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span className="truncate">{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <Badge variant="secondary" className="text-xs">{categoryCounts[cat]}</Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Article List & Content */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : selectedArticle && currentArticle ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(null)}>← Back</Button>
                  <Badge variant="outline">{currentArticle.category?.replace(/_/g, ' ')}</Badge>
                  {!currentArticle.is_published && <Badge variant="secondary">Draft</Badge>}
                </div>
                <CardTitle className="text-lg">{currentArticle.title}</CardTitle>
                {currentArticle.summary && <p className="text-sm text-muted-foreground">{currentArticle.summary}</p>}
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {currentArticle.content}
                </div>
              </CardContent>
            </Card>
          ) : filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{search ? 'No articles match your search' : 'No handbook articles yet'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredArticles.map((article: any) => (
                <Card key={article.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedArticle(article.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{article.title}</p>
                        {article.summary && <p className="text-xs text-muted-foreground truncate">{article.summary}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{article.category?.replace(/_/g, ' ')}</Badge>
                          {!article.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
