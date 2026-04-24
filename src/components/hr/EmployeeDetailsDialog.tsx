import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Employee } from '@/hooks/useEmployees';
import { useEmployeeDocuments, EmployeeDocument } from '@/hooks/useEmployeeDocuments';
import { User, Briefcase, CreditCard, Phone, MapPin, Calendar, Upload, FileText, Trash2, Download, Globe, Building2, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmployeeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeDetailsDialog({ open, onOpenChange, employee }: EmployeeDetailsDialogProps) {
  const { documents, uploadDocument, deleteDocument, getDownloadUrl } = useEmployeeDocuments(employee?.id);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('contract');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExpiry, setDocExpiry] = useState('');

  if (!employee) return null;

  const totalSalary = (employee.basic_salary || 0) + (employee.housing_allowance || 0) +
    (employee.transport_allowance || 0) + (employee.other_allowances || 0);

  const handleUpload = () => {
    if (docFile && docTitle) {
      uploadDocument.mutate({
        employeeId: employee.id,
        file: docFile,
        title: docTitle,
        documentType: docType,
        expiryDate: docExpiry || undefined,
      });
      setUploadOpen(false);
      setDocTitle('');
      setDocFile(null);
      setDocExpiry('');
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const url = await getDownloadUrl(doc.file_url);
      window.open(url, '_blank');
    } catch (e) {
      console.error('Download error', e);
    }
  };

  const docTypeLabels: Record<string, string> = {
    contract: 'Employment Contract',
    id_copy: 'ID Copy',
    passport: 'Passport',
    certificate: 'Certificate',
    medical: 'Medical Report',
    visa: 'Visa / Iqama',
    other: 'Other',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span>{employee.first_name} {employee.last_name}</span>
              <p className="text-sm font-normal text-muted-foreground">{employee.employee_code}</p>
            </div>
            <Badge variant={employee.employment_status === 'active' ? 'default' : 'secondary'} className="ml-auto">
              {employee.employment_status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="salary">Salary</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem icon={<User className="h-4 w-4" />} label="Email" value={employee.email} />
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={employee.phone} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Date of Birth"
                value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'MMM d, yyyy') : null} />
              <InfoItem label="Gender" value={employee.gender} />
              <InfoItem label="Nationality" value={employee.nationality} />
              <InfoItem label="National ID" value={employee.national_id} />
              <InfoItem label="Marital Status" value={employee.marital_status} />
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Address</h4>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{[employee.address, employee.city, employee.country, employee.postal_code].filter(Boolean).join(', ') || '-'}</span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Name" value={employee.emergency_contact_name} />
                <InfoItem label="Phone" value={employee.emergency_contact_phone} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4 mt-4">
            {/* Organization */}
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Organization</h4>
              <div className="grid grid-cols-3 gap-4">
                <InfoItem icon={<Globe className="h-4 w-4" />} label="Region" value={employee.region?.name} />
                <InfoItem icon={<Building2 className="h-4 w-4" />} label="Company" value={employee.company?.name} />
                <InfoItem icon={<GitBranch className="h-4 w-4" />} label="Branch" value={employee.branch?.name} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Department" value={employee.department?.name} />
              <InfoItem label="Position" value={employee.position?.title} />
              <InfoItem label="Hire Date" value={format(new Date(employee.hire_date), 'MMM d, yyyy')} />
              <InfoItem label="Employment Type" value={employee.employment_type?.replace('_', ' ')} />
              <InfoItem label="Work Location" value={employee.work_location} />
              <InfoItem label="Manager"
                value={employee.manager && employee.manager.length > 0
                  ? `${employee.manager[0].first_name} ${employee.manager[0].last_name}` : null} />
            </div>
            {employee.termination_date && (
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">
                  Termination Date: {format(new Date(employee.termination_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="salary" className="space-y-4 mt-4">
            <div className="p-4 bg-primary/5 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground">Total Monthly Salary</p>
              <p className="text-3xl font-bold">SAR {totalSalary.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SalaryItem label="Basic Salary" value={employee.basic_salary} />
              <SalaryItem label="Housing Allowance" value={employee.housing_allowance} />
              <SalaryItem label="Transport Allowance" value={employee.transport_allowance} />
              <SalaryItem label="Other Allowances" value={employee.other_allowances} />
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Banking Details</h4>
              <div className="grid grid-cols-1 gap-4">
                <InfoItem label="Bank Name" value={employee.bank_name} />
                <InfoItem label="Account Number" value={employee.bank_account} />
                <InfoItem label="IBAN" value={employee.iban} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Employee Documents</h4>
              <Button size="sm" onClick={() => setUploadOpen(!uploadOpen)}>
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
            </div>

            {uploadOpen && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document Title *</Label>
                    <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(docTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>File *</Label>
                    <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleUpload} disabled={!docFile || !docTitle || uploadDocument.isPending}>
                    Upload
                  </Button>
                </div>
              </div>
            )}

            {documents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {docTypeLabels[doc.document_type] || doc.document_type}
                          {doc.expiry_date && ` • Expires: ${format(new Date(doc.expiry_date), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDocument.mutate(doc)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="font-medium capitalize">{value || '-'}</p>
    </div>
  );
}

function SalaryItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="p-3 border rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">SAR {(value || 0).toLocaleString()}</p>
    </div>
  );
}
