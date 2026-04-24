import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  FileCheck, HardHat, Layers, AlertTriangle, ClipboardCheck, Shield,
  CheckCircle2, BarChart3, Target,
} from 'lucide-react';

// ── Pre-Tender Checklist ──
const preTenderChecklist = [
  { id: 'pt1', label: 'Invitation to Tender (ITT) received & logged', category: 'Documents' },
  { id: 'pt2', label: 'Tender documents downloaded and distributed', category: 'Documents' },
  { id: 'pt3', label: 'Pre-qualification requirements verified', category: 'Documents' },
  { id: 'pt4', label: 'NDA / Confidentiality agreement signed', category: 'Documents' },
  { id: 'pt5', label: 'Insurance requirements reviewed (CAR, PI, PL)', category: 'Compliance' },
  { id: 'pt6', label: 'Bond/guarantee capacity confirmed with bank', category: 'Compliance' },
  { id: 'pt7', label: 'GOSI/HRSD compliance certificates valid', category: 'Compliance' },
  { id: 'pt8', label: 'Saudization (Nitaqat) status Green or above', category: 'Compliance' },
  { id: 'pt9', label: 'Site visit / reconnaissance completed', category: 'Site' },
  { id: 'pt10', label: 'Geotechnical data & soil report reviewed', category: 'Site' },
  { id: 'pt11', label: 'Utilities & access routes confirmed', category: 'Site' },
  { id: 'pt12', label: 'Environmental constraints identified', category: 'Site' },
];

const siteReconSteps = [
  'Verify site boundaries and access points',
  'Assess existing ground conditions and topography',
  'Identify underground services (water, sewage, electrical)',
  'Check proximity to neighboring structures',
  'Evaluate temporary facilities locations (offices, storage)',
  'Photograph all key areas for record',
  'Note crane/heavy plant access constraints',
  'Confirm material delivery route feasibility',
];

const costBuildUp = [
  { item: 'Direct Labour', pct: 28, range: '25–35%', color: 'bg-blue-500' },
  { item: 'Materials', pct: 38, range: '35–45%', color: 'bg-green-500' },
  { item: 'Plant & Equipment', pct: 11, range: '8–15%', color: 'bg-yellow-500' },
  { item: 'Subcontractors', pct: 14, range: '10–20%', color: 'bg-purple-500' },
  { item: 'Preliminaries / Site OH', pct: 10, range: '8–12%', color: 'bg-orange-500' },
  { item: 'Head Office OH', pct: 4, range: '3–6%', color: 'bg-cyan-500' },
  { item: 'Profit', pct: 5, range: '3–8%', color: 'bg-emerald-500' },
  { item: 'Contingency', pct: 3, range: '2–5%', color: 'bg-red-500' },
];

const contractAlerts = [
  { type: 'LDs', desc: 'Liquidated Damages – typically 0.5%-1% of contract value per week, capped at 10%', severity: 'high' },
  { type: 'Retention', desc: 'Usually 5-10% deducted from each IPA, half released at Practical Completion, balance at end of DLP', severity: 'medium' },
  { type: 'Advance Payment', desc: 'Typically 10-20% mobilization advance against unconditional bank guarantee, recovered proportionally from IPAs', severity: 'medium' },
  { type: 'Price Adjustment', desc: 'Check for fluctuation clauses (CECA/BEAMA indices). Fixed price vs fluctuating — critical for long-duration contracts (>12 months)', severity: 'medium' },
  { type: 'Performance Bond', desc: '5-10% of contract value, valid until DLP expiry + 3 months', severity: 'high' },
  { type: 'DLP Period', desc: 'Defects Liability Period – usually 12-24 months from Practical Completion', severity: 'medium' },
];

// ── 10 BOQ Categories ──
const boqCategories = [
  {
    name: 'Preliminaries & General', icon: '📋', pctRange: '~8–12% of total',
    items: [
      { ref: '01.01', desc: 'Site establishment & mobilization', unit: 'Sum', considerations: 'Temporary offices, welfare, fencing, access roads, signage', risk: 'Medium' },
      { ref: '01.02', desc: 'Project management & supervision', unit: 'Wks', considerations: 'PM, RE, QS, Safety Officer — full duration', risk: 'Low' },
      { ref: '01.03', desc: 'Temporary works design', unit: 'Sum', considerations: 'Shoring, falsework, cofferdam — PE/CE approved', risk: 'High' },
      { ref: '01.04', desc: 'Testing & commissioning', unit: 'Sum', considerations: 'All statutory & contractual testing, T&C engineer', risk: 'Medium' },
      { ref: '01.05', desc: 'Health, safety & environmental', unit: 'Wks', considerations: 'CDM Principal Contractor duties, F10 notification', risk: 'High' },
      { ref: '01.06', desc: 'Insurances & bonds', unit: 'Sum', considerations: 'CAR, PL, Performance Bond (10%), APG (if req)', risk: 'Medium' },
      { ref: '01.07', desc: 'Demobilisation & site clearance', unit: 'Sum', considerations: 'Remove all temp works, restore, as-built drawings', risk: 'Low' },
    ],
  },
  {
    name: 'Groundworks & Earthworks', icon: '🏗️', pctRange: 'HIGH RISK',
    items: [
      { ref: '02.01', desc: 'Bulk excavation (unrestricted)', unit: 'm³', considerations: 'Swell factor, disposal distance, tip charges', risk: 'Medium' },
      { ref: '02.02', desc: 'Excavation in rock (Class C)', unit: 'm³', considerations: 'Blasting licence, vibration monitoring, neighbour impact', risk: 'High' },
      { ref: '02.03', desc: 'Excavation to foundations (max 2m deep)', unit: 'm³', considerations: 'Groundwater control, shoring, spoil segregation', risk: 'Medium' },
      { ref: '02.04', desc: 'Selected fill & compaction', unit: 'm³', considerations: 'Material spec, CBR, testing frequency per layer', risk: 'Medium' },
      { ref: '02.05', desc: 'Disposal of excavated material (offsite)', unit: 'm³', considerations: 'Waste classification — inert/non-haz/hazardous, duty of care', risk: 'High' },
      { ref: '02.06', desc: 'Ground dewatering system', unit: 'Wks', considerations: 'Pumping, monitoring wells, discharge consent', risk: 'High' },
      { ref: '02.07', desc: 'Contaminated land treatment', unit: 'm³', considerations: 'Phase I/II ESA, remediation strategy, EA approval', risk: 'High' },
    ],
  },
  {
    name: 'Piling', icon: '🔩',
    items: [
      { ref: 'C.01', desc: 'Bored piles (CFA / rotary)', unit: 'LM', considerations: 'Pile load test requirements, working platforms', risk: 'High' },
      { ref: 'C.02', desc: 'Driven piles (precast / steel)', unit: 'No.', considerations: 'Noise/vibration restrictions, set criteria', risk: 'High' },
      { ref: 'C.03', desc: 'Pile caps & ground beams', unit: 'm³', considerations: 'Reinforcement detailing, waterproofing', risk: 'Medium' },
      { ref: 'C.04', desc: 'Pile integrity testing', unit: 'No.', considerations: 'PIT, CHAMP, or static load test', risk: 'Medium' },
    ],
  },
  {
    name: 'Concrete Works', icon: '🧱',
    items: [
      { ref: 'D.01', desc: 'Foundations (strip, raft, pad)', unit: 'm³', considerations: 'Concrete grade, pour sequence, curing', risk: 'Medium' },
      { ref: 'D.02', desc: 'RC columns & shear walls', unit: 'm³', considerations: 'Formwork system, rebar congestion', risk: 'High' },
      { ref: 'D.03', desc: 'Suspended slabs & beams', unit: 'm³', considerations: 'Propping, back-propping sequence', risk: 'High' },
      { ref: 'D.04', desc: 'Staircase & lift cores', unit: 'm³', considerations: 'Slip-form or jump-form options', risk: 'Medium' },
      { ref: 'D.05', desc: 'Waterproofing (below ground)', unit: 'm²', considerations: 'System type (membrane, crystalline)', risk: 'Medium' },
    ],
  },
  {
    name: 'Steelwork', icon: '🏢',
    items: [
      { ref: 'E.01', desc: 'Structural steel frame', unit: 'Ton', considerations: 'Connection type (bolted/welded), fire protection', risk: 'High' },
      { ref: 'E.02', desc: 'Metal decking (composite)', unit: 'm²', considerations: 'Gauge, shear studs, propping', risk: 'Medium' },
      { ref: 'E.03', desc: 'Steel stairs & platforms', unit: 'Ton', considerations: 'Anti-slip treads, handrail spec', risk: 'Low' },
      { ref: 'E.04', desc: 'Intumescent fire protection', unit: 'm²', considerations: 'Fire rating requirement (30/60/90 min)', risk: 'Medium' },
    ],
  },
  {
    name: 'Masonry', icon: '🧱',
    items: [
      { ref: 'F.01', desc: 'Blockwork walls', unit: 'm²', considerations: 'Block type, movement joints, DPC', risk: 'Low' },
      { ref: 'F.02', desc: 'Brick facing', unit: 'm²', considerations: 'Mortar mix, pointing style, sample panel', risk: 'Medium' },
      { ref: 'F.03', desc: 'Cavity wall construction', unit: 'm²', considerations: 'Insulation type, cavity width, wall ties', risk: 'Medium' },
      { ref: 'F.04', desc: 'Lintels & precast elements', unit: 'No.', considerations: 'Load bearing capacity, DPC tray', risk: 'Low' },
    ],
  },
  {
    name: 'Roofing', icon: '🏠',
    items: [
      { ref: 'G.01', desc: 'Flat roof (single-ply/built-up)', unit: 'm²', considerations: 'Fall direction, drainage design, warranty', risk: 'High' },
      { ref: 'G.02', desc: 'Pitched roof (tile/sheet)', unit: 'm²', considerations: 'Wind loading, underlayment, ventilation', risk: 'Medium' },
      { ref: 'G.03', desc: 'Roof insulation', unit: 'm²', considerations: 'U-value compliance, vapor barrier', risk: 'Low' },
      { ref: 'G.04', desc: 'Rainwater goods (gutters/downpipes)', unit: 'LM', considerations: 'Material (uPVC/aluminum), sizing calcs', risk: 'Low' },
    ],
  },
  {
    name: 'Mechanical (HVAC/Plumbing)', icon: '⚙️',
    items: [
      { ref: 'H.01', desc: 'HVAC systems (AHU, FCU, VRF)', unit: 'LS', considerations: 'Cooling load, ductwork routing, BMS integration', risk: 'High' },
      { ref: 'H.02', desc: 'Plumbing & drainage', unit: 'LS', considerations: 'Pipe material, insulation, testing pressure', risk: 'Medium' },
      { ref: 'H.03', desc: 'Fire protection (sprinklers, hydrants)', unit: 'LS', considerations: 'Civil Defense approval, flow/pressure calcs', risk: 'High' },
      { ref: 'H.04', desc: 'Lifts & escalators', unit: 'No.', considerations: 'Capacity, speed, shaft dimensions, maintenance', risk: 'High' },
      { ref: 'H.05', desc: 'BMS / Building automation', unit: 'LS', considerations: 'Integration protocol (BACnet/Modbus)', risk: 'Medium' },
    ],
  },
  {
    name: 'Electrical', icon: '⚡',
    items: [
      { ref: 'I.01', desc: 'HV/LV power distribution', unit: 'LS', considerations: 'SEC approval, transformer sizing, switchgear', risk: 'High' },
      { ref: 'I.02', desc: 'Lighting (internal & external)', unit: 'LS', considerations: 'Lux levels, energy efficiency, emergency lighting', risk: 'Medium' },
      { ref: 'I.03', desc: 'Fire alarm & detection', unit: 'LS', considerations: 'System type (conventional/addressable), Civil Defense', risk: 'High' },
      { ref: 'I.04', desc: 'Structured cabling & ICT', unit: 'LS', considerations: 'Cat6A/Fiber, pathway routing, comms rooms', risk: 'Medium' },
      { ref: 'I.05', desc: 'Earthing & lightning protection', unit: 'LS', considerations: 'Soil resistivity, down conductors', risk: 'Medium' },
    ],
  },
  {
    name: 'External Works', icon: '🌳',
    items: [
      { ref: 'J.01', desc: 'Roads & parking', unit: 'm²', considerations: 'Asphalt/interlock, drainage, line marking', risk: 'Medium' },
      { ref: 'J.02', desc: 'Landscaping & irrigation', unit: 'm²', considerations: 'Plant species, water source, maintenance', risk: 'Low' },
      { ref: 'J.03', desc: 'Boundary walls & fencing', unit: 'LM', considerations: 'Height, material, security requirements', risk: 'Low' },
      { ref: 'J.04', desc: 'External services (water, sewer, storm)', unit: 'LS', considerations: 'Authority connections, pipe sizes, inspections', risk: 'Medium' },
      { ref: 'J.05', desc: 'External lighting & CCTV', unit: 'LS', considerations: 'Pole heights, camera coverage, power supply', risk: 'Low' },
    ],
  },
];

// ── Risk Matrix ──
const riskLevels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const impactLevels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
const riskColors: Record<number, string> = {
  1: 'bg-green-200 text-green-900', 2: 'bg-green-200 text-green-900',
  3: 'bg-yellow-200 text-yellow-900', 4: 'bg-yellow-200 text-yellow-900',
  5: 'bg-orange-200 text-orange-900', 6: 'bg-orange-200 text-orange-900',
  8: 'bg-orange-200 text-orange-900', 9: 'bg-orange-200 text-orange-900',
  10: 'bg-red-200 text-red-900', 12: 'bg-red-200 text-red-900',
  15: 'bg-red-200 text-red-900', 16: 'bg-red-200 text-red-900',
  20: 'bg-red-300 text-red-900', 25: 'bg-red-400 text-white',
};
const getRC = (s: number) => riskColors[s] || (s >= 15 ? 'bg-red-300 text-red-900' : s >= 8 ? 'bg-orange-200 text-orange-900' : s >= 4 ? 'bg-yellow-200 text-yellow-900' : 'bg-green-200 text-green-900');

const topTenderRisks = [
  { risk: 'Incomplete design information', likelihood: 4, impact: 4 },
  { risk: 'Ground condition uncertainty', likelihood: 3, impact: 5 },
  { risk: 'Material price escalation', likelihood: 4, impact: 3 },
  { risk: 'Subcontractor availability', likelihood: 3, impact: 4 },
  { risk: 'Programme constraints', likelihood: 3, impact: 3 },
  { risk: 'Regulatory approval delays', likelihood: 3, impact: 4 },
  { risk: 'Client scope changes', likelihood: 4, impact: 4 },
  { risk: 'Currency / forex risk', likelihood: 2, impact: 3 },
];

const meatCriteria = [
  { criterion: 'Price / Cost', weight: 40, maxScore: 100 },
  { criterion: 'Technical Approach', weight: 25, maxScore: 100 },
  { criterion: 'Experience & Track Record', weight: 15, maxScore: 100 },
  { criterion: 'Programme / Schedule', weight: 10, maxScore: 100 },
  { criterion: 'Health & Safety Plan', weight: 5, maxScore: 100 },
  { criterion: 'Social Value / Saudization', weight: 5, maxScore: 100 },
];

// ── Submission Checklist ──
const submissionChecklist = [
  { id: 's1', label: 'Priced BOQ completed and checked', section: 'Commercial' },
  { id: 's2', label: 'Method statement prepared', section: 'Technical' },
  { id: 's3', label: 'Programme / Gantt chart attached', section: 'Technical' },
  { id: 's4', label: 'Organization chart included', section: 'Technical' },
  { id: 's5', label: 'CVs of key personnel attached', section: 'Technical' },
  { id: 's6', label: 'HSE plan prepared', section: 'HSE' },
  { id: 's7', label: 'Quality management plan attached', section: 'Quality' },
  { id: 's8', label: 'Bid bond / tender guarantee arranged', section: 'Commercial' },
  { id: 's9', label: 'Company profile & credentials included', section: 'Admin' },
  { id: 's10', label: 'All addenda acknowledged', section: 'Admin' },
  { id: 's11', label: 'Form of Tender signed & sealed', section: 'Admin' },
  { id: 's12', label: 'Anti-bribery declaration attached', section: 'Compliance' },
  { id: 's13', label: 'GOSI / Zakat certificates current', section: 'Compliance' },
  { id: 's14', label: 'Insurance certificates attached', section: 'Compliance' },
  { id: 's15', label: 'Final review & sign-off by management', section: 'Admin' },
];

const riskBadge = (r: string) => {
  const c = r === 'High' ? 'bg-red-100 text-red-800' : r === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  return <Badge className={c}>{r}</Badge>;
};

export default function TenderBOQPanel() {
  const [ptChecked, setPtChecked] = useState<Record<string, boolean>>({});
  const [subChecked, setSubChecked] = useState<Record<string, boolean>>({});

  const toggle = (set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string) =>
    set(prev => ({ ...prev, [id]: !prev[id] }));

  const ptDone = Object.values(ptChecked).filter(Boolean).length;
  const subDone = Object.values(subChecked).filter(Boolean).length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" /> Tender & BOQ Reference Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="pretender" className="w-full">
          <TabsList className="w-full justify-start px-4 flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="pretender"><FileCheck className="h-3.5 w-3.5 mr-1" />Pre-Tender</TabsTrigger>
            <TabsTrigger value="boq"><Layers className="h-3.5 w-3.5 mr-1" />BOQ Categories</TabsTrigger>
            <TabsTrigger value="risk"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Risk & MEAT</TabsTrigger>
            <TabsTrigger value="submission"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Submission</TabsTrigger>
          </TabsList>

          {/* ── Pre-Tender ── */}
          <TabsContent value="pretender" className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Document Checklist</h3>
              <Badge variant="outline">{ptDone}/{preTenderChecklist.length} Complete</Badge>
            </div>
            <Progress value={(ptDone / preTenderChecklist.length) * 100} className="h-2" />
            <div className="grid gap-2">
              {preTenderChecklist.map(item => (
                <label key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={!!ptChecked[item.id]} onCheckedChange={() => toggle(setPtChecked, item.id)} />
                  <span className={ptChecked[item.id] ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{item.category}</Badge>
                </label>
              ))}
            </div>

            <h3 className="font-semibold pt-2">Site Reconnaissance Steps</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {siteReconSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>

            <h3 className="font-semibold pt-2">Cost Build-Up %</h3>
            <div className="space-y-2">
              {costBuildUp.map(c => (
                <div key={c.item} className="flex items-center gap-3 text-sm">
                  <span className="w-36">{c.item}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.pct * 100 / 38}%` }} />
                  </div>
                  <Badge variant="outline" className="text-xs font-mono w-16 justify-center">{c.range}</Badge>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">Contract Condition Alerts</h3>
            <div className="grid gap-2">
              {contractAlerts.map(a => (
                <div key={a.type} className="flex items-start gap-3 p-2 border rounded-md">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${a.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <div>
                    <p className="font-medium text-sm">{a.type}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── BOQ Categories ── */}
          <TabsContent value="boq" className="px-4 pb-4 space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
              <span className="font-semibold">ℹ️ NRM2 / SMM7 / CESMM4:</span> Each item must be fully described, quantified, and priced with unit rates. Click any category to expand.
            </div>
            <ScrollArea className="h-[550px]">
              <Accordion type="multiple" className="w-full">
                {boqCategories.map((cat, ci) => (
                  <AccordionItem key={ci} value={`boq-${ci}`}>
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="font-semibold">{cat.name}</span>
                        <Badge variant="outline" className="ml-2">{cat.items.length} items</Badge>
                        {cat.pctRange && <Badge variant="secondary" className="text-xs">{cat.pctRange}</Badge>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Ref</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-14">Unit</TableHead>
                            <TableHead>Key Considerations</TableHead>
                            <TableHead className="w-20">Risk</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cat.items.map(item => (
                            <TableRow key={item.ref}>
                              <TableCell className="font-mono text-xs">{item.ref}</TableCell>
                              <TableCell className="text-sm">{item.desc}</TableCell>
                              <TableCell className="text-xs">{item.unit}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.considerations}</TableCell>
                              <TableCell>{riskBadge(item.risk)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
              <span className="font-semibold">📐 Critical BOQ Analysis Tips:</span> Always perform a "plug check" — multiply quantities by industry benchmark rates and compare to your total. Discrepancies &gt;10% in any section warrant further investigation. Flag items where the quantity appears incorrect and raise a formal TQ (Tender Query) before submission deadline.
            </div>

            <div className="p-3 bg-muted border border-border rounded-md font-mono text-xs space-y-1">
              <p className="text-primary font-semibold">Unit Rate = (Labour + Plant + Material) × (1 + OH% + Profit%) × Risk Multiplier</p>
              <p className="text-primary">Weighted Average Rate = Σ(Quantity × Rate) / Σ(Quantity)</p>
              <p className="text-primary">Contract Value = Σ(BOQ Item Quantities × Unit Rates) + Provisional Sums + Contingency</p>
            </div>
          </TabsContent>

          {/* ── Risk & MEAT ── */}
          <TabsContent value="risk" className="px-4 pb-4 space-y-4">
            <h3 className="font-semibold">5×5 Risk Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border bg-muted text-left">Likelihood ↓ / Impact →</th>
                    {impactLevels.map((il, i) => (
                      <th key={i} className="p-2 border bg-muted text-center">{il}<br /><span className="text-muted-foreground">({i + 1})</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...riskLevels].reverse().map((rl, ri) => {
                    const l = 5 - ri;
                    return (
                      <tr key={ri}>
                        <td className="p-2 border bg-muted font-medium">{rl} ({l})</td>
                        {impactLevels.map((_, ii) => {
                          const score = l * (ii + 1);
                          return (
                            <td key={ii} className={`p-2 border text-center font-bold ${getRC(score)}`}>
                              {score}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="font-semibold pt-2">Top Tender Risks</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk</TableHead>
                  <TableHead className="w-20 text-center">L</TableHead>
                  <TableHead className="w-20 text-center">I</TableHead>
                  <TableHead className="w-20 text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTenderRisks.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.risk}</TableCell>
                    <TableCell className="text-center">{r.likelihood}</TableCell>
                    <TableCell className="text-center">{r.impact}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={getRC(r.likelihood * r.impact)}>{r.likelihood * r.impact}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <h3 className="font-semibold pt-2">MEAT Evaluation Scoring</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  <TableHead className="w-20 text-center">Weight %</TableHead>
                  <TableHead className="w-20 text-center">Max Score</TableHead>
                  <TableHead className="w-28 text-center">Weighted Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meatCriteria.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{c.criterion}</TableCell>
                    <TableCell className="text-center">{c.weight}%</TableCell>
                    <TableCell className="text-center">{c.maxScore}</TableCell>
                    <TableCell className="text-center font-bold">{(c.weight * c.maxScore / 100).toFixed(0)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                  <TableCell className="text-center">–</TableCell>
                  <TableCell className="text-center">{meatCriteria.reduce((s, c) => s + c.weight * c.maxScore / 100, 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Submission ── */}
          <TabsContent value="submission" className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Submission Requirements Checklist</h3>
              <Badge variant="outline">{subDone}/{submissionChecklist.length} Complete</Badge>
            </div>
            <Progress value={(subDone / submissionChecklist.length) * 100} className="h-2" />
            {['Commercial', 'Technical', 'HSE', 'Quality', 'Admin', 'Compliance'].map(section => {
              const items = submissionChecklist.filter(c => c.section === section);
              return (
                <div key={section}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">{section}</h4>
                  <div className="grid gap-1">
                    {items.map(item => (
                      <label key={item.id} className="flex items-center gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox checked={!!subChecked[item.id]} onCheckedChange={() => toggle(setSubChecked, item.id)} />
                        <span className={subChecked[item.id] ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
