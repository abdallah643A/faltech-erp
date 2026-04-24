import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDedupCandidates, useCreditProfiles, useStewardshipOwners, useChangeLog } from '@/hooks/useMDMSuite';
import { Database, Users, AlertTriangle, ShieldCheck, History, GitMerge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MDMOverviewPage() {
  const { t } = useLanguage();
  const dedup = useDedupCandidates('pending');
  const credit = useCreditProfiles();
  const stewards = useStewardshipOwners();
  const log = useChangeLog(undefined, 10);

  const tiles = [
    { label: t('mdm.tile.dedup'), value: dedup.data?.length ?? 0, icon: GitMerge, href: '/mdm/dedup', color: 'text-amber-500' },
    { label: t('mdm.tile.credit'), value: credit.data?.length ?? 0, icon: ShieldCheck, href: '/mdm/credit-profiles', color: 'text-emerald-500' },
    { label: t('mdm.tile.stewards'), value: stewards.data?.length ?? 0, icon: Users, href: '/mdm/stewardship', color: 'text-indigo-500' },
    { label: t('mdm.tile.changes'), value: log.data?.length ?? 0, icon: History, href: '/mdm/change-log', color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6" />{t('mdm.overview.title')}</h1>
        <p className="text-muted-foreground">{t('mdm.overview.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.href} to={tile.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{tile.label}</p>
                  <p className="text-3xl font-bold">{tile.value}</p>
                </div>
                <tile.icon className={`h-8 w-8 ${tile.color}`} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{t('mdm.overview.recentChanges')}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(log.data ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between border-b py-2 text-sm">
                <div>
                  <span className="font-medium">{c.change_type}</span> · {c.change_summary}
                </div>
                <span className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleString()}</span>
              </div>
            ))}
            {(log.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('mdm.overview.noChanges')}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild variant="outline"><Link to="/mdm/hierarchies">{t('mdm.nav.hierarchies')}</Link></Button>
        <Button asChild variant="outline"><Link to="/mdm/validation-policies">{t('mdm.nav.validation')}</Link></Button>
        <Button asChild variant="outline"><Link to="/mdm/tax-registrations">{t('mdm.nav.tax')}</Link></Button>
        <Button asChild variant="outline"><Link to="/mdm/segments">{t('mdm.nav.segments')}</Link></Button>
      </div>
    </div>
  );
}
