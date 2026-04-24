import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, FileEdit, ClipboardCheck, ShieldAlert, FileText, MessageSquare, Receipt } from "lucide-react";

const TILES = [
  { to: "/subcontractor-admin/packages", title: "Work Packages", icon: Package, desc: "Award and manage subcontractor packages" },
  { to: "/subcontractor-admin/progress", title: "Progress Review", icon: TrendingUp, desc: "Review WBS progress submissions and photos" },
  { to: "/subcontractor-admin/variations", title: "Variation Requests", icon: FileEdit, desc: "Approve VRs, link to PCN/CO" },
  { to: "/subcontractor-admin/qa", title: "QA / QC", icon: ClipboardCheck, desc: "Inspection submissions and results" },
  { to: "/subcontractor-admin/hse", title: "HSE", icon: ShieldAlert, desc: "Incidents, near-misses, toolbox talks" },
  { to: "/subcontractor-admin/ipc", title: "IPC & Retention", icon: Receipt, desc: "Certify interim payments, track retention" },
  { to: "/subcontractor-admin/documents", title: "Document Exchange", icon: FileText, desc: "Drawings, transmittals, method statements" },
  { to: "/subcontractor-admin/tasks", title: "Tasks & Messaging", icon: MessageSquare, desc: "RFI/NCR/transmittal threads" },
];

export default function SubcontractorPortalAdminHub() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subcontractor Portal Administration</h1>
        <p className="text-sm text-muted-foreground">Manage packages, progress, variations, QA/HSE, IPC, documents and site collaboration.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map(t => (
          <Card key={t.to} className="cursor-pointer hover:shadow-md transition" onClick={() => navigate(t.to)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <t.icon className="h-4 w-4 text-primary" />
                {t.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
