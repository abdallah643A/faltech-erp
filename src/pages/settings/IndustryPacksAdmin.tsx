import { useIndustryPacks, type IndustryPack } from '@/hooks/useIndustryPacks';
import { usePackTemplates } from '@/hooks/usePackTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, Hospital, UtensilsCrossed, Truck, ShoppingBag, GraduationCap, Factory, Sparkles, Package, Flag, Download, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PACK_ICONS: Record<string, any> = {
  construction: Building2,
  manufacturing: Factory,
  fleet: Truck,
  hospital: Hospital,
  restaurant: UtensilsCrossed,
  retail_pos: ShoppingBag,
  education: GraduationCap,
};

export default function IndustryPacksAdmin() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { packs, isPackEnabled, setActivation } = useIndustryPacks();
  const {
    templates, featureFlags, dependencies,
    installTemplate, setFeatureOverride, isFeatureEnabled, isInstalled,
  } = usePackTemplates();

  const core = (packs.data ?? []).filter(p => p.status === 'core' || p.status === 'active');
  const optional = (packs.data ?? []).filter(p => p.status === 'optional' || p.status === 'beta');

  const renderPack = (pack: IndustryPack) => {
    const Icon = PACK_ICONS[pack.pack_key] ?? Sparkles;
    const enabled = isPackEnabled(pack.pack_key);
    const isCore = pack.status === 'core' || pack.status === 'active';

    return (
      <Card key={pack.id} className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg p-2 bg-primary/10 text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">
                  {isAr && pack.pack_name_ar ? pack.pack_name_ar : pack.pack_name}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {pack.is_premium && <Badge variant="outline" className="text-[10px]">Premium</Badge>}
                  <Badge variant={isCore ? 'default' : enabled ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                    {pack.status}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{pack.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {(pack.features ?? []).slice(0, 6).map((f) => (
                  <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">v{pack.version}</span>
                {isCore ? (
                  <Badge variant="default" className="text-[10px]">Always on</Badge>
                ) : (
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setActivation.mutate({ pack_key: pack.pack_key, is_active: checked })
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTemplate = (tpl: any) => {
    const installed = isInstalled(tpl.id);
    const deps = (dependencies.data ?? []).filter(d => d.pack_key === tpl.pack_key);
    return (
      <Card key={tpl.id} className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">
                {isAr && tpl.template_name_ar ? tpl.template_name_ar : tpl.template_name}
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] capitalize">{tpl.pack_key}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{tpl.description}</p>
          {deps.length > 0 && (
            <div className="text-[10px] text-muted-foreground mb-2">
              {isAr ? 'تعتمد على: ' : 'Depends on: '}
              {deps.map(d => d.depends_on_pack_key).join(', ')}
            </div>
          )}
          <div className="flex flex-wrap gap-1 mb-3">
            {Object.keys(tpl.seed_payload ?? {}).map(k => (
              <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">v{tpl.version}</span>
            {installed ? (
              <Badge variant="default" className="text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3" /> {isAr ? 'مثبت' : 'Installed'}
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                disabled={installTemplate.isPending}
                onClick={() => installTemplate.mutate(tpl.id)}>
                <Download className="h-3 w-3" /> {isAr ? 'تثبيت' : 'Install'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const flagsByPack = (featureFlags.data ?? []).reduce((acc: Record<string, any[]>, f) => {
    (acc[f.pack_key] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'حزم الصناعات' : 'Industry Packs'}</h1>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? 'تفعيل أو تعطيل وحدات قطاعية، وتثبيت قوالب جاهزة، والتحكم في ميزات كل حزمة.'
            : 'Activate industry modules, install starter templates, and control per-pack feature flags.'}
        </p>
      </div>

      <Tabs defaultValue="packs">
        <TabsList>
          <TabsTrigger value="packs"><Sparkles className="h-3.5 w-3.5 mr-1" />{isAr ? 'الحزم' : 'Packs'}</TabsTrigger>
          <TabsTrigger value="templates"><Package className="h-3.5 w-3.5 mr-1" />{isAr ? 'القوالب' : 'Templates'}</TabsTrigger>
          <TabsTrigger value="flags"><Flag className="h-3.5 w-3.5 mr-1" />{isAr ? 'الميزات' : 'Feature Flags'}</TabsTrigger>
        </TabsList>

        <TabsContent value="packs" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{isAr ? 'الصناعات النشطة' : 'Active Industries'}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{core.map(renderPack)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2">
              {isAr ? 'حزم اختيارية' : 'Optional Packs'}
              <Badge variant="outline" className="text-[10px]">{optional.length}</Badge>
            </CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {optional.map(renderPack)}
                {optional.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No optional packs.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{isAr ? 'قوالب قابلة للتثبيت' : 'Installable Templates'}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(templates.data ?? []).map(renderTemplate)}
                {(templates.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">No templates available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4 mt-4">
          {Object.entries(flagsByPack).map(([packKey, flags]) => (
            <Card key={packKey}>
              <CardHeader><CardTitle className="text-base capitalize flex items-center gap-2">
                {packKey.replace('_', ' ')}
                <Badge variant="outline" className="text-[10px]">{flags.length}</Badge>
              </CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {flags.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded border border-border/60">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {isAr && f.flag_name_ar ? f.flag_name_ar : f.flag_name}
                        </span>
                        {f.is_premium && <Badge variant="outline" className="text-[10px]">Premium</Badge>}
                      </div>
                      {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                    </div>
                    <Switch
                      checked={isFeatureEnabled(f.pack_key, f.flag_key)}
                      onCheckedChange={(v) =>
                        setFeatureOverride.mutate({ pack_key: f.pack_key, flag_key: f.flag_key, is_enabled: v })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {Object.keys(flagsByPack).length === 0 && (
            <p className="text-sm text-muted-foreground">No feature flags configured.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
