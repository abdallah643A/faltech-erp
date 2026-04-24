import { useWorkspaceTabs, type WorkspaceTab } from '@/contexts/WorkspaceTabsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect } from 'react';

export function WorkspaceTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, closeOtherTabs, closeAllTabs } = useWorkspaceTabs();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Sync active tab with current route (guarded to prevent render loops)
  useEffect(() => {
    const currentTab = tabs.find(t => t.path === location.pathname);
    if (currentTab && currentTab.id !== activeTabId) {
      setActiveTab(currentTab.id);
    }
    // Intentionally exclude `tabs` and `setActiveTab` to avoid loops on every tab mutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, activeTabId]);

  if (tabs.length === 0) return null;

  const handleTabClick = (tab: WorkspaceTab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    const isActive = tabId === activeTabId;
    closeTab(tabId);
    
    if (isActive) {
      const remaining = tabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        navigate(remaining[remaining.length - 1].path);
      }
    }
  };

  return (
    <div className="flex items-center bg-muted/40 border-b border-border px-1 h-9 shrink-0">
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-0.5 py-0.5">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                onAuxClick={(e) => { if (e.button === 1) handleClose(e, tab.id); }}
                className={cn(
                  'group flex items-center gap-1.5 px-3 h-7 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap max-w-[200px]',
                  isActive
                    ? 'bg-background text-foreground border border-b-0 border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                )}
              >
                {tab.hasUnsavedChanges && (
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title={isAr ? 'تغييرات غير محفوظة' : 'Unsaved changes'} />
                )}
                <span className="truncate">{tab.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleClose(e, tab.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClose(e as any, tab.id); }}
                  className={cn(
                    'shrink-0 rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>

      {tabs.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 p-1 rounded hover:bg-muted ml-1">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => activeTabId && closeOtherTabs(activeTabId)}>
              {isAr ? 'إغلاق التبويبات الأخرى' : 'Close Other Tabs'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={closeAllTabs} className="text-destructive">
              {isAr ? 'إغلاق الكل' : 'Close All Tabs'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
