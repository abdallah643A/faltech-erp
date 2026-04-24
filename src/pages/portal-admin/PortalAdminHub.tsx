import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, MessageSquare, CheckSquare, Crown, Palette, Activity, Shield, Languages, LifeBuoy, CreditCard, KeyRound, BarChart3, Sparkles } from 'lucide-react';

const tiles = [
  { to: '/portal-admin/members', icon: Users, title: 'Members & invitations', desc: 'Invite clients, suppliers, subcontractors, and admins.' },
  { to: '/portal-admin/documents', icon: FileText, title: 'Document exchange', desc: 'Review documents shared by portal users.' },
  { to: '/portal-admin/rfq-responses', icon: MessageSquare, title: 'RFQ responses', desc: 'Quotes from suppliers and subcontractors.' },
  { to: '/portal-admin/rfq-ai-normalize', icon: Sparkles, title: 'AI bid normalization', desc: 'Compare RFQ bids with AI-driven scorecard.' },
  { to: '/portal-admin/approvals', icon: CheckSquare, title: 'Approval tasks', desc: 'Cross-portal sign-offs awaiting decision.' },
  { to: '/portal-admin/service-requests', icon: LifeBuoy, title: 'Service requests', desc: 'Inbox of client-submitted service tickets.' },
  { to: '/portal-admin/subscription-requests', icon: CreditCard, title: 'Subscription requests', desc: 'Tenant self-service plan/seat changes.' },
  { to: '/portal-admin/seats', icon: Crown, title: 'SaaS seat governance', desc: 'Manage seat assignments per subscription.' },
  { to: '/portal-admin/branding', icon: Palette, title: 'White-label builder', desc: 'Customize portal branding per audience.' },
  { to: '/portal-admin/locales', icon: Languages, title: 'Multilingual content', desc: 'Manage portal translations per locale.' },
  { to: '/portal-admin/security-policies', icon: Shield, title: 'Security policies', desc: 'Password, lockout, MFA & magic-link rules.' },
  { to: '/portal-admin/login-heatmap', icon: Activity, title: 'Login heatmap', desc: 'Visualize portal login activity over 30 days.' },
  { to: '/portal-admin/tenant-sso', icon: KeyRound, title: 'Tenant SSO', desc: 'Configure SAML/OIDC per SaaS tenant.' },
  { to: '/portal-admin/tenant-analytics', icon: BarChart3, title: 'Tenant analytics', desc: 'Usage, seat utilization, activity per tenant.' },
  { to: '/portal-admin/activity-feed', icon: Activity, title: 'Activity feed', desc: 'Bidirectional events across portals & ERP.' },
];

export default function PortalAdminHub() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Portal Administration</h1>
        <p className="text-sm text-muted-foreground">Unified control over client, supplier, subcontractor, and SaaS-admin portals.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><t.icon className="h-5 w-5 text-primary" />{t.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{t.desc}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
