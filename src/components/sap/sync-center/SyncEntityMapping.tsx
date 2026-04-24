import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSyncEntityConfig } from '@/hooks/useSyncJobs';
import { Loader2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SyncEntityMapping() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { configs, isLoading } = useSyncEntityConfig();

  // Build dependency graph
  const masterData = configs.filter((c: any) => c.is_master_data);
  const transactions = configs.filter((c: any) => !c.is_master_data);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? 'ترتيب التبعيات' : 'Dependency Order & Entity Mapping'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">{isAr ? 'بيانات رئيسية' : 'Master Data'}</Badge>
                  <span className="text-xs text-muted-foreground">{isAr ? 'تتم مزامنتها أولاً' : 'Synced first'}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {masterData.sort((a: any, b: any) => a.dependency_order - b.dependency_order).map((c: any, i: number) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors">
                        <p className="text-sm font-medium">{c.display_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.source_endpoint}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">PK: {c.primary_key_field}</Badge>
                          <Badge variant="outline" className="text-[10px]">Order: {c.dependency_order}</Badge>
                        </div>
                      </div>
                      {i < masterData.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge>{isAr ? 'معاملات' : 'Transactions'}</Badge>
                  <span className="text-xs text-muted-foreground">{isAr ? 'بعد البيانات الرئيسية' : 'After master data'}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {transactions.sort((a: any, b: any) => a.dependency_order - b.dependency_order).map((c: any) => (
                    <div key={c.id} className="border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors">
                      <p className="text-sm font-medium">{c.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.source_endpoint}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px]">PK: {c.primary_key_field}</Badge>
                        <Badge variant="outline" className="text-[10px]">Incr: {c.incremental_field}</Badge>
                        <Badge variant="outline" className="text-[10px]">Batch: {c.batch_size}</Badge>
                        <Badge variant={c.is_enabled ? 'secondary' : 'destructive'} className="text-[10px]">
                          {c.is_enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      {c.depends_on && c.depends_on.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Depends: {c.depends_on.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
