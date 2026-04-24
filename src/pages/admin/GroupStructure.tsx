import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Globe } from 'lucide-react';
import { CompaniesTab } from '@/components/admin/group/CompaniesTab';
import { BranchesTab } from '@/components/admin/group/BranchesTab';
import { CountriesTab } from '@/components/admin/group/CountriesTab';

export default function GroupStructure() {
  const [tab, setTab] = useState('companies');
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Group Structure
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage companies, branches, and countries for multi-entity, multi-country operations.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-2" />Companies</TabsTrigger>
          <TabsTrigger value="branches"><MapPin className="h-4 w-4 mr-2" />Branches</TabsTrigger>
          <TabsTrigger value="countries"><Globe className="h-4 w-4 mr-2" />Countries</TabsTrigger>
        </TabsList>
        <TabsContent value="companies" className="mt-4"><CompaniesTab /></TabsContent>
        <TabsContent value="branches" className="mt-4"><BranchesTab /></TabsContent>
        <TabsContent value="countries" className="mt-4"><CountriesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
