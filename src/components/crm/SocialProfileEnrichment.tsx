import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { Linkedin, Globe, Building2, Search, UserCheck, Sparkles } from 'lucide-react';

interface EnrichedProfile {
  id: string;
  name: string;
  company: string;
  title: string;
  linkedin: string;
  industry: string;
  companySize: string;
  enrichmentScore: number;
  status: 'enriched' | 'pending' | 'not_found';
}

const labels: Record<string, Record<string, string>> = {
  en: { title: 'Social Profile Enrichment', subtitle: 'Auto-enrich leads with social & company data', search: 'Search leads to enrich...', enrich: 'Enrich All', name: 'Name', company: 'Company', jobTitle: 'Job Title', industry: 'Industry', companySize: 'Company Size', score: 'Score', status: 'Status', enriched: 'Enriched', pending: 'Pending', notFound: 'Not Found', totalEnriched: 'Total Enriched', avgScore: 'Avg Enrichment Score', pendingEnrichment: 'Pending Enrichment' },
  ar: { title: 'إثراء الملفات الاجتماعية', subtitle: 'إثراء تلقائي للعملاء المحتملين بالبيانات الاجتماعية', search: 'ابحث عن عملاء لإثرائهم...', enrich: 'إثراء الكل', name: 'الاسم', company: 'الشركة', jobTitle: 'المسمى الوظيفي', industry: 'الصناعة', companySize: 'حجم الشركة', score: 'النتيجة', status: 'الحالة', enriched: 'مُثرى', pending: 'قيد الانتظار', notFound: 'غير موجود', totalEnriched: 'إجمالي المُثرى', avgScore: 'متوسط نتيجة الإثراء', pendingEnrichment: 'قيد الإثراء' },
  ur: { title: 'سوشل پروفائل اثراء', subtitle: 'لیڈز کو سوشل اور کمپنی ڈیٹا سے خودکار اثراء', search: 'اثراء کے لیے لیڈز تلاش کریں...', enrich: 'سب کو اثراء کریں', name: 'نام', company: 'کمپنی', jobTitle: 'عہدہ', industry: 'صنعت', companySize: 'کمپنی کا سائز', score: 'اسکور', status: 'حالت', enriched: 'مثری', pending: 'زیر التوا', notFound: 'نہیں ملا', totalEnriched: 'کل مثری', avgScore: 'اوسط اثراء اسکور', pendingEnrichment: 'اثراء زیر التوا' },
  hi: { title: 'सोशल प्रोफ़ाइल संवर्धन', subtitle: 'सोशल और कंपनी डेटा से लीड्स को ऑटो-एनरिच करें', search: 'एनरिच करने के लिए लीड्स खोजें...', enrich: 'सभी एनरिच करें', name: 'नाम', company: 'कंपनी', jobTitle: 'पद', industry: 'उद्योग', companySize: 'कंपनी का आकार', score: 'स्कोर', status: 'स्थिति', enriched: 'एनरिच्ड', pending: 'लंबित', notFound: 'नहीं मिला', totalEnriched: 'कुल एनरिच्ड', avgScore: 'औसत एनरिचमेंट स्कोर', pendingEnrichment: 'एनरिचमेंट लंबित' },
};

const mockProfiles: EnrichedProfile[] = [
  { id: '1', name: 'Ahmed Al-Rashidi', company: 'Saudi Tech Corp', title: 'CTO', linkedin: 'linkedin.com/in/ahmed', industry: 'Technology', companySize: '500-1000', enrichmentScore: 92, status: 'enriched' },
  { id: '2', name: 'Fatima Hassan', company: 'Gulf Industries', title: 'Procurement Manager', linkedin: 'linkedin.com/in/fatima', industry: 'Manufacturing', companySize: '1000+', enrichmentScore: 85, status: 'enriched' },
  { id: '3', name: 'Omar Khan', company: 'Desert Solutions', title: 'CEO', linkedin: '', industry: '', companySize: '', enrichmentScore: 0, status: 'pending' },
  { id: '4', name: 'Sara Al-Qahtani', company: 'Vision Enterprises', title: 'VP Sales', linkedin: 'linkedin.com/in/sara', industry: 'Consulting', companySize: '100-500', enrichmentScore: 78, status: 'enriched' },
];

export function SocialProfileEnrichment() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;
  const [search, setSearch] = useState('');

  const filtered = mockProfiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.company.toLowerCase().includes(search.toLowerCase())
  );

  const enriched = mockProfiles.filter(p => p.status === 'enriched').length;
  const avgScore = Math.round(mockProfiles.filter(p => p.status === 'enriched').reduce((s, p) => s + p.enrichmentScore, 0) / (enriched || 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{l.title}</h3>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />{l.enrich}</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.totalEnriched}</p><p className="text-2xl font-bold text-primary">{enriched}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.avgScore}</p><p className="text-2xl font-bold">{avgScore}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.pendingEnrichment}</p><p className="text-2xl font-bold text-warning">{mockProfiles.filter(p => p.status === 'pending').length}</p></CardContent></Card>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={l.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{l.name}</TableHead><TableHead>{l.company}</TableHead><TableHead>{l.jobTitle}</TableHead>
              <TableHead>{l.industry}</TableHead><TableHead>{l.companySize}</TableHead><TableHead>{l.score}</TableHead><TableHead>{l.status}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-muted-foreground" />{p.name}</TableCell>
                  <TableCell><div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{p.company}</div></TableCell>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.industry || '-'}</TableCell>
                  <TableCell>{p.companySize || '-'}</TableCell>
                  <TableCell>{p.enrichmentScore > 0 ? <span className="font-bold text-primary">{p.enrichmentScore}%</span> : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'enriched' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'}>
                      {p.status === 'enriched' ? l.enriched : p.status === 'pending' ? l.pending : l.notFound}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
