import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, AlertTriangle, ShieldAlert, CalendarClock, Award } from 'lucide-react';

const tiles = [
  { to: '/supplier-portal-admin/prequalification', icon: FileQuestion, label: 'Prequalification', desc: 'Weighted assessments + AI risk', color: 'text-blue-500' },
  { to: '/supplier-portal-admin/disputes', icon: AlertTriangle, label: 'Disputes', desc: 'Threaded with SLA & escalation', color: 'text-red-500' },
  { to: '/supplier-portal-admin/profile-approvals', icon: ShieldAlert, label: 'Profile Approvals', desc: 'Field-level dual approval', color: 'text-orange-500' },
  { to: '/supplier-portal-admin/compliance', icon: CalendarClock, label: 'Compliance Tracker', desc: 'Cert/insurance renewals', color: 'text-yellow-500' },
  { to: '/supplier-portal-admin/scorecards', icon: Award, label: 'Scorecard Publishing', desc: 'Publish performance metrics', color: 'text-purple-500' },
];

export default function SupplierPortalAdminHub() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">Supplier Portal Administration</h1>
        <p className="text-sm text-muted-foreground">Manage prequalification, disputes, profile approvals, compliance, and scorecards</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(t => (
          <Link key={t.to} to={t.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <t.icon className={`h-8 w-8 ${t.color}`} />
                <div>
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
