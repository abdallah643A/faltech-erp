import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, ShoppingCart, Users, FolderOpen, Receipt, Zap } from 'lucide-react';

const defaultActions = [
  { label: 'Create Quote', href: '/quotes?action=new', icon: FileText, color: 'hsl(var(--primary))' },
  { label: 'Create PO', href: '/procurement?tab=purchase-orders&action=new', icon: ShoppingCart, color: 'hsl(var(--success))' },
  { label: 'Create Invoice', href: '/ar-invoices?action=new', icon: Receipt, color: 'hsl(var(--warning))' },
  { label: 'Add Employee', href: '/hr/employees?action=new', icon: Users, color: 'hsl(var(--info))' },
  { label: 'Open Project', href: '/pm/projects?action=new', icon: FolderOpen, color: 'hsl(var(--accent))' },
  { label: 'New Lead', href: '/leads?action=new', icon: Plus, color: 'hsl(var(--destructive))' },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {defaultActions.map(action => (
            <Button
              key={action.href}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs font-medium"
              onClick={() => navigate(action.href)}
            >
              <action.icon className="h-4 w-4" style={{ color: action.color }} />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
