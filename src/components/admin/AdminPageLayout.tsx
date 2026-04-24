import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Save, RotateCcw, Download, Upload, History, AlertTriangle, ChevronDown, Shield,
  Info, Clock, FileText, CheckCircle2, Loader2, X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFormGuard } from '@/hooks/useFormGuard';
import { AuditEntry } from '@/hooks/useAuditTrail';
import { format } from 'date-fns';

interface AdminPageLayoutProps {
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  icon?: React.ReactNode;
  module: string;
  isDirty?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  onResetToDefaults?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  changeSummary?: { key: string; oldValue: string; newValue: string }[];
  auditEntries?: AuditEntry[];
  affectedModules?: string[];
  permissionLevel?: 'no_access' | 'view_only' | 'edit' | 'approve' | 'admin';
  children: React.ReactNode;
  showAuditPanel?: boolean;
}

export function AdminPageLayout({
  title, titleAr, description, descriptionAr, icon, module,
  isDirty = false, isLoading = false, isSaving = false,
  onSave, onReset, onResetToDefaults, onExport, onImport,
  changeSummary = [], auditEntries = [], affectedModules = [],
  permissionLevel = 'edit', children, showAuditPanel = true,
}: AdminPageLayoutProps) {
  const { language } = useLanguage();
  const isRtl = language === 'ar';
  const { showDialog, confirmLeave, cancelLeave } = useFormGuard(isDirty);
  const [showChanges, setShowChanges] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const isReadOnly = permissionLevel === 'view_only' || permissionLevel === 'no_access';

  const displayTitle = isRtl && titleAr ? titleAr : title;
  const displayDesc = isRtl && descriptionAr ? descriptionAr : description;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && <div className="mt-1 text-primary">{icon}</div>}
          <div>
            <h1 className="text-2xl font-bold">{displayTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">{displayDesc}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isDirty ? 'destructive' : 'secondary'} className="text-xs">
                {isDirty ? '● Unsaved Changes' : '✓ Saved'}
              </Badge>
              {isReadOnly && (
                <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" />Read Only</Badge>
              )}
              {affectedModules.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Info className="h-3 w-3 mr-1" />Affects: {affectedModules.join(', ')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {onImport && !isReadOnly && (
            <Button variant="outline" size="sm" onClick={onImport}><Upload className="h-4 w-4 mr-1" />Import</Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-1" />Export</Button>
          )}
          {onResetToDefaults && !isReadOnly && (
            <Button variant="outline" size="sm" onClick={onResetToDefaults}><RotateCcw className="h-4 w-4 mr-1" />Defaults</Button>
          )}
          {onReset && isDirty && !isReadOnly && (
            <Button variant="ghost" size="sm" onClick={onReset}><X className="h-4 w-4 mr-1" />Cancel</Button>
          )}
          {onSave && !isReadOnly && (
            <Button size="sm" onClick={() => {
              if (changeSummary.length > 0) setShowChanges(true);
              else onSave();
            }} disabled={!isDirty || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Warning banner for critical changes */}
      {isDirty && changeSummary.some(c => c.key.includes('currency') || c.key.includes('costing') || c.key.includes('fiscal')) && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Critical configuration change detected. This may affect live transactions and posted accounting data.
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Main content */}
          <div className="xl:col-span-3 space-y-4">{children}</div>

          {/* Side panel */}
          {showAuditPanel && (
            <div className="space-y-4">
              {/* Audit History */}
              <Collapsible open={auditOpen} onOpenChange={setAuditOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50">
                  <span className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" />Change History</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${auditOpen ? '' : '-rotate-90'}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-64 border rounded-b-lg p-2">
                    {auditEntries.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No changes recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {auditEntries.slice(0, 20).map((entry) => (
                          <div key={entry.id} className="text-xs border-b pb-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{entry.action}</span>
                              <span className="text-muted-foreground">{format(new Date(entry.created_at), 'MMM d HH:mm')}</span>
                            </div>
                            <div className="text-muted-foreground">{entry.changed_by_name}</div>
                            {entry.changed_fields?.map(f => (
                              <div key={f} className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-[10px]">{f}</Badge>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>

              {/* Module Info */}
              <div className="p-3 bg-muted/20 rounded-lg space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1"><Info className="h-3 w-3" />Module Info</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Module: <span className="font-medium text-foreground">{module}</span></p>
                  <p>Permission: <Badge variant="outline" className="text-[10px]">{permissionLevel}</Badge></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change Summary Dialog */}
      <AlertDialog open={showChanges} onOpenChange={setShowChanges}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              The following settings will be updated:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-60">
            <div className="space-y-2 p-2">
              {changeSummary.map(c => (
                <div key={c.key} className="text-sm border rounded p-2">
                  <div className="font-medium">{c.key}</div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-red-500 line-through">{c.oldValue || '(empty)'}</span>
                    <span>→</span>
                    <span className="text-green-600">{c.newValue || '(empty)'}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowChanges(false); onSave?.(); }}>
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Navigation Dialog */}
      <AlertDialog open={showDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Are you sure you want to leave?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Reusable Section component
export function AdminSection({ title, description, children, defaultOpen = true, badge }: {
  title: string; description?: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-t-lg hover:bg-muted/50 border border-b-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 space-y-3 border rounded-b-lg">
          {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Reusable Setting Field component
export function SettingField({ label, helpText, error, children, effectType, source, required }: {
  label: string; helpText?: string; error?: string; children: React.ReactNode;
  effectType?: string; source?: string; required?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
      <div>
        <label className="text-sm font-medium">
          {label}{required && <span className="text-destructive ml-1">*</span>}
        </label>
        {helpText && <p className="text-[11px] text-muted-foreground mt-0.5">{helpText}</p>}
        <div className="flex gap-1 mt-1">
          {effectType && (
            <Badge variant="outline" className="text-[9px]">
              <Clock className="h-2.5 w-2.5 mr-0.5" />{effectType}
            </Badge>
          )}
          {source && source !== 'system_default' && (
            <Badge variant="secondary" className="text-[9px]">{source}</Badge>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        {children}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    </div>
  );
}
