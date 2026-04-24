import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmployeeExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  nationality?: string;
  marital_status?: string;
  address?: string;
  city?: string;
  country?: string;
  hire_date?: string;
  employment_type?: string;
  employment_status?: string;
  work_location?: string;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  other_allowances?: number;
  bank_name?: string;
  bank_account?: string;
  iban?: string;
}

interface ValidationResult {
  row: number;
  data: ImportRow;
  errors: string[];
  isValid: boolean;
}

export function EmployeeExcelImport({ open, onOpenChange }: EmployeeExcelImportProps) {
  const { createEmployee } = useEmployees();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const downloadTemplate = () => {
    const template = [
      {
        employee_code: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+966512345678',
        date_of_birth: '1990-01-15',
        gender: 'male',
        national_id: '1234567890',
        nationality: 'Saudi',
        marital_status: 'single',
        address: '123 Main Street',
        city: 'Riyadh',
        country: 'Saudi Arabia',
        hire_date: '2024-01-01',
        employment_type: 'full_time',
        employment_status: 'active',
        work_location: 'Head Office',
        basic_salary: 10000,
        housing_allowance: 2500,
        transport_allowance: 500,
        other_allowances: 0,
        bank_name: 'Al Rajhi Bank',
        bank_account: '1234567890',
        iban: 'SA0000000000001234567890',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }
    ];

    XLSX.writeFile(wb, 'employee_import_template.xlsx');
    toast({ title: 'Template downloaded successfully' });
  };

  const validateRow = (row: any, rowIndex: number): ValidationResult => {
    const errors: string[] = [];
    
    // Required fields
    if (!row.employee_code?.toString().trim()) {
      errors.push('Employee code is required');
    }
    if (!row.first_name?.toString().trim()) {
      errors.push('First name is required');
    }
    if (!row.last_name?.toString().trim()) {
      errors.push('Last name is required');
    }
    if (!row.email?.toString().trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.toString().trim())) {
      errors.push('Invalid email format');
    }

    // Validate gender
    if (row.gender && !['male', 'female'].includes(row.gender.toString().toLowerCase())) {
      errors.push('Gender must be "male" or "female"');
    }

    // Validate marital status
    const validMaritalStatus = ['single', 'married', 'divorced', 'widowed'];
    if (row.marital_status && !validMaritalStatus.includes(row.marital_status.toString().toLowerCase())) {
      errors.push('Invalid marital status');
    }

    // Validate employment type
    const validEmploymentTypes = ['full_time', 'part_time', 'contract', 'internship'];
    if (row.employment_type && !validEmploymentTypes.includes(row.employment_type.toString().toLowerCase().replace(' ', '_'))) {
      errors.push('Invalid employment type');
    }

    // Validate employment status
    const validStatuses = ['active', 'on_leave', 'terminated'];
    if (row.employment_status && !validStatuses.includes(row.employment_status.toString().toLowerCase().replace(' ', '_'))) {
      errors.push('Invalid employment status');
    }

    // Convert and clean data
    const data: ImportRow = {
      employee_code: row.employee_code?.toString().trim() || '',
      first_name: row.first_name?.toString().trim() || '',
      last_name: row.last_name?.toString().trim() || '',
      email: row.email?.toString().trim() || '',
      phone: row.phone?.toString().trim() || undefined,
      date_of_birth: formatExcelDate(row.date_of_birth) || undefined,
      gender: row.gender?.toString().toLowerCase().trim() || undefined,
      national_id: row.national_id?.toString().trim() || undefined,
      nationality: row.nationality?.toString().trim() || undefined,
      marital_status: row.marital_status?.toString().toLowerCase().trim() || undefined,
      address: row.address?.toString().trim() || undefined,
      city: row.city?.toString().trim() || undefined,
      country: row.country?.toString().trim() || 'Saudi Arabia',
      hire_date: formatExcelDate(row.hire_date) || new Date().toISOString().split('T')[0],
      employment_type: row.employment_type?.toString().toLowerCase().replace(' ', '_').trim() || 'full_time',
      employment_status: row.employment_status?.toString().toLowerCase().replace(' ', '_').trim() || 'active',
      work_location: row.work_location?.toString().trim() || undefined,
      basic_salary: parseFloat(row.basic_salary) || 0,
      housing_allowance: parseFloat(row.housing_allowance) || 0,
      transport_allowance: parseFloat(row.transport_allowance) || 0,
      other_allowances: parseFloat(row.other_allowances) || 0,
      bank_name: row.bank_name?.toString().trim() || undefined,
      bank_account: row.bank_account?.toString().trim() || undefined,
      iban: row.iban?.toString().trim() || undefined,
    };

    return {
      row: rowIndex + 2, // +2 for header row and 0-indexing
      data,
      errors,
      isValid: errors.length === 0
    };
  };

  const formatExcelDate = (value: any): string | undefined => {
    if (!value) return undefined;
    
    // Check if it's an Excel serial date number
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toISOString().split('T')[0];
    }
    
    // If it's already a string in YYYY-MM-DD format
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return undefined;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setValidationResults([]);
    setImportComplete(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
          toast({ 
            title: 'Empty file', 
            description: 'The Excel file contains no data rows.',
            variant: 'destructive' 
          });
          setIsProcessing(false);
          return;
        }

        const results = jsonData.map((row, index) => validateRow(row, index));
        setValidationResults(results);
        setIsProcessing(false);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast({ 
          title: 'Error reading file', 
          description: 'Please make sure the file is a valid Excel file.',
          variant: 'destructive' 
        });
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validRows = validationResults.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast({ title: 'No valid rows to import', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (const result of validRows) {
      try {
        await createEmployee.mutateAsync(result.data);
        successCount++;
      } catch (error) {
        console.error(`Error importing row ${result.row}:`, error);
      }
    }

    setImportedCount(successCount);
    setImportComplete(true);
    setIsProcessing(false);
    
    toast({ 
      title: 'Import complete', 
      description: `Successfully imported ${successCount} out of ${validRows.length} employees.` 
    });
  };

  const handleClose = () => {
    setValidationResults([]);
    setImportComplete(false);
    setImportedCount(0);
    onOpenChange(false);
  };

  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Employees from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Use our template to ensure your data is formatted correctly
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          {!importComplete && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Upload Excel File</p>
              <p className="text-sm text-muted-foreground mb-4">
                Supported formats: .xlsx, .xls
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Import Complete Message */}
          {importComplete && (
            <Alert className="border-primary/20 bg-primary/5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Successfully imported {importedCount} employees. You can close this dialog.
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Results */}
          {validationResults.length > 0 && !importComplete && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} valid rows
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {invalidCount} rows with errors
                  </span>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result, index) => (
                      <TableRow key={index} className={result.isValid ? '' : 'bg-destructive/5'}>
                        <TableCell>{result.row}</TableCell>
                        <TableCell>{result.data.employee_code}</TableCell>
                        <TableCell>{result.data.first_name} {result.data.last_name}</TableCell>
                        <TableCell>{result.data.email}</TableCell>
                        <TableCell>
                          {result.isValid ? (
                            <span className="text-primary text-sm">Valid</span>
                          ) : (
                            <span className="text-destructive text-sm">
                              {result.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importComplete ? 'Close' : 'Cancel'}
          </Button>
          {validationResults.length > 0 && !importComplete && validCount > 0 && (
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>Import {validCount} Employees</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
