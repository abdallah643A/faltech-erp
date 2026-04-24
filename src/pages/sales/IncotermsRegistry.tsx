import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ship } from 'lucide-react';
import { useIncoterms } from '@/hooks/useQuoteToCash';

export default function IncotermsRegistry() {
  const { incoterms, isLoading } = useIncoterms();

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Ship className="h-6 w-6 text-primary" /> Incoterms 2020 Registry</h1>
        <p className="text-sm text-muted-foreground">International commercial terms for delivery, risk, and cost responsibility</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Incoterms ({incoterms.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Transport</TableHead><TableHead>Seller Responsibility</TableHead><TableHead>Buyer Responsibility</TableHead><TableHead>Risk Transfer</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6">Loading...</TableCell></TableRow>}
              {incoterms.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell><Badge className="font-mono">{i.code}</Badge></TableCell>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell><span className="text-xs">{i.transport_mode}</span></TableCell>
                  <TableCell className="text-xs">{i.seller_responsibility}</TableCell>
                  <TableCell className="text-xs">{i.buyer_responsibility}</TableCell>
                  <TableCell className="text-xs italic">{i.risk_transfer_point}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
