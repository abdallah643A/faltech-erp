import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Filter, X, Eye } from 'lucide-react';

const DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Procurement', 'Projects', 'Sales', 'Production', 'Administration', 'IT'];

export default function ECMSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const [docType, setDocType] = useState('');
  const [confidentiality, setConfidentiality] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['ecm-search', searchTrigger],
    queryFn: async () => {
      if (!query && !dept && !docType) return [];
      let q = supabase.from('ecm_documents').select('*').order('created_at', { ascending: false }).limit(100);
      if (query) q = q.or(`title.ilike.%${query}%,file_name.ilike.%${query}%,ocr_text.ilike.%${query}%,reference_number.ilike.%${query}%`);
      if (dept) q = q.eq('department', dept);
      if (docType) q = q.eq('document_type', docType);
      if (confidentiality) q = q.eq('confidentiality', confidentiality);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: searchTrigger > 0,
  });

  const doSearch = () => setSearchTrigger(t => t + 1);
  const clearFilters = () => { setQuery(''); setDept(''); setDocType(''); setConfidentiality(''); setDateFrom(''); setDateTo(''); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Document Search</h1>

      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search by title, content, reference number..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
            </div>
            <Button onClick={doSearch}>Search</Button>
            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
              <Filter className="h-4 w-4 mr-1" /> Filters
            </Button>
          </div>
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Department</Label>
                <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {['general', 'contract', 'invoice', 'policy', 'report', 'letter'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Confidentiality</Label>
                <Select value={confidentiality} onValueChange={setConfidentiality}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {['public', 'internal', 'confidential', 'strictly_confidential'].map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Clear</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {searchTrigger > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{isLoading ? 'Searching...' : `${results.length} result(s) found`}</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 && !isLoading ? (
              <p className="text-center text-muted-foreground py-8">No documents match your search criteria</p>
            ) : (
              <div className="space-y-2">
                {results.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.document_number} • {doc.department || 'No department'} • {new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{doc.document_type}</Badge>
                      <Badge variant={doc.status === 'active' ? 'default' : 'secondary'} className="text-xs">{doc.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ecm/viewer/${doc.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
