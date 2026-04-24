import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Save, Copy, Trash2, Search, ChevronLeft, ChevronRight, Upload,
} from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'name', header: 'Name' },
  { key: 'title', header: 'Title' },
  { key: 'position', header: 'Position' },
  { key: 'mobile', header: 'Mobile' },
  { key: 'email', header: 'Email' },
  { key: 'default', header: 'Default' },
  { key: 'actions', header: 'Actions' },
  { key: 'city', header: 'City' },
  { key: 'country', header: 'Country' },
];


export default function BPMasterDataPage() {
  const [bpType, setBpType] = useState<'Customer' | 'Vendor' | 'Lead'>('Customer');
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-4">
      {/* Top Navigation */}
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Business Partner Master Data</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="bpmaster-data-page" title="B P Master Data Page" />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>
          <Button size="sm" variant="secondary" className="gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
          <Button size="sm" variant="secondary" className="gap-1"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
          <Button size="sm" variant="ghost" className="text-white"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-white"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* BP Type toggle + Code search */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4 flex items-center gap-4">
        <div className="flex bg-[#f0f2f4] rounded p-0.5">
          {(['Customer', 'Vendor', 'Lead'] as const).map(t => (
            <button key={t} onClick={() => setBpType(t)} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${bpType === t ? 'bg-[#0066cc] text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{t}</button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input placeholder="BP Code..." className="h-8 text-sm border-[#d0d5dd] max-w-xs" />
        </div>
      </div>

      {/* Header Section */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">BP Code</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">BP Name</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Foreign Name</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Group</Label>
              <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select group" /></SelectTrigger><SelectContent><SelectItem value="g1">General</SelectItem><SelectItem value="g2">VIP</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Currency</Label><Input className="h-8 text-sm border-[#d0d5dd]" defaultValue="SAR" /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Federal Tax ID</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#f0f2f4] rounded text-center"><div className="text-lg font-bold text-[#0066cc]">0.00</div><div className="text-xs text-gray-500">Account Balance</div></div>
            <div className="p-3 bg-[#f0f2f4] rounded text-center"><div className="text-lg font-bold text-amber-600">0.00</div><div className="text-xs text-gray-500">Delivery Balance</div></div>
            <div className="p-3 bg-[#f0f2f4] rounded text-center"><div className="text-lg font-bold text-[#1a7a4a]">0.00</div><div className="text-xs text-gray-500">Orders Balance</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Phone 1</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Phone 2</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Email</Label><Input className="h-8 text-sm border-[#d0d5dd]" type="email" /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Website</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-[#d0d5dd]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contacts">Contact Persons</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="payment">Payment System</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Shipping Type</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="express">Express</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Payment Terms</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="net30">Net 30</SelectItem><SelectItem value="net60">Net 60</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Credit Limit</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Industry</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="construction">Construction</SelectItem><SelectItem value="trading">Trading</SelectItem><SelectItem value="services">Services</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Effective Discount %</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Price List</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="pl1">Default Price List</SelectItem></SelectContent></Select></div>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="flex justify-between mb-3"><h3 className="text-sm font-semibold">Contact Persons</h3><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Contact</Button></div>
          <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Title</th><th className="p-2 text-left border-b border-[#d0d5dd]">Position</th><th className="p-2 text-left border-b border-[#d0d5dd]">Mobile</th><th className="p-2 text-left border-b border-[#d0d5dd]">Email</th><th className="p-2 text-center border-b border-[#d0d5dd]">Default</th><th className="p-2 text-center border-b border-[#d0d5dd]">Actions</th></tr></thead>
            <tbody><tr><td colSpan={7} className="p-4 text-center text-gray-400">No contacts added</td></tr></tbody>
          </table>
        </TabsContent>

        <TabsContent value="addresses" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2"><h3 className="text-sm font-semibold">Bill To Addresses</h3><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button></div>
              <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">City</th><th className="p-2 text-left border-b border-[#d0d5dd]">Country</th><th className="p-2 text-center border-b border-[#d0d5dd]">Default</th></tr></thead><tbody><tr><td colSpan={4} className="p-4 text-center text-gray-400">No bill-to addresses</td></tr></tbody></table>
            </div>
            <div>
              <div className="flex justify-between mb-2"><h3 className="text-sm font-semibold">Ship To Addresses</h3><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button></div>
              <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">City</th><th className="p-2 text-left border-b border-[#d0d5dd]">Country</th><th className="p-2 text-center border-b border-[#d0d5dd]">Default</th></tr></thead><tbody><tr><td colSpan={4} className="p-4 text-center text-gray-400">No ship-to addresses</td></tr></tbody></table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">House Bank</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="b1">Main Bank</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Bank Account No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">IBAN</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">SWIFT Code</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Payment Method</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="transfer">Bank Transfer</SelectItem><SelectItem value="check">Check</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Dunning Level</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="1">Level 1</SelectItem><SelectItem value="2">Level 2</SelectItem><SelectItem value="3">Level 3</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex items-center gap-4 mt-3"><Checkbox id="pb" /><Label htmlFor="pb" className="text-sm">Payment Block</Label><Checkbox id="sp" /><Label htmlFor="sp" className="text-sm">Single Payment</Label></div>
        </TabsContent>

        <TabsContent value="accounting" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Control Account</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 G/L Account" /></div>
            <div className="space-y-1"><Label className="text-xs">Cost Center</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="cc1">Main</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Tax Group</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="exempt">Exempt</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">VAT Reg. No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Tax Status</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="exempt">Exempt</SelectItem><SelectItem value="zero">Zero-Rated</SelectItem></SelectContent></Select></div>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="flex items-center gap-2"><Checkbox id={`prop${i}`} /><Label htmlFor={`prop${i}`} className="text-sm">Property {String(i + 1).padStart(2, '0')}</Label></div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="remarks" className="bg-white rounded border border-[#d0d5dd] p-4">
          <Textarea className="min-h-[200px] border-[#d0d5dd]" placeholder="Remarks..." />
        </TabsContent>

        <TabsContent value="attachments" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="border-2 border-dashed border-[#d0d5dd] rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Drag and drop files here or click to upload</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
