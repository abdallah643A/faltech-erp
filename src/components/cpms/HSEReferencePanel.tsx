import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, AlertTriangle, ClipboardList, Siren, FileText, HardHat, Flame, Lock, Anchor,
} from 'lucide-react';

const cdmDuties = [
  { role: 'Client', duties: ['Appoint PD and PC', 'Ensure adequate resources and time', 'Provide pre-construction information', 'Ensure welfare facilities'] },
  { role: 'Principal Designer (PD)', duties: ['Plan, manage, and coordinate H&S in pre-construction', 'Prepare Health & Safety File', 'Liaise with PC', 'Identify and eliminate/reduce risks through design'] },
  { role: 'Principal Contractor (PC)', duties: ['Plan, manage, and coordinate construction phase H&S', 'Prepare Construction Phase Plan', 'Ensure site induction for all workers', 'Consult and engage with workers'] },
  { role: 'Designers', duties: ['Eliminate hazards where possible', 'Reduce risks through design choices', 'Provide information about remaining risks', 'Consider buildability and maintainability'] },
  { role: 'Contractors', duties: ['Plan and manage own work safely', 'Provide welfare if not done by PC', 'Comply with PC directions', 'Report anything likely to endanger health/safety'] },
  { role: 'Workers', duties: ['Cooperate with employer and PC', 'Report unsafe conditions', 'Use PPE correctly', 'Attend required training'] },
];

const fatalFive = [
  { hazard: 'Working at Height', icon: '🏗️', stats: 'Leading cause of construction fatalities (~50%)', controls: 'Edge protection, scaffolding, MEWP, harness systems, rescue plans' },
  { hazard: 'Struck by Moving Vehicle/Object', icon: '🚜', stats: '~20% of construction fatalities', controls: 'Segregation of pedestrians/vehicles, banksmen, reversing cameras, exclusion zones' },
  { hazard: 'Collapse / Structural Failure', icon: '🏚️', stats: 'Excavation collapse, scaffold collapse, structural instability', controls: 'Temporary works design, inspections, exclusion zones, shoring systems' },
  { hazard: 'Contact with Electricity', icon: '⚡', stats: 'HV/LV contact, underground/overhead cables', controls: 'Permit to Work, cable avoidance tools, isolation procedures, LOTO' },
  { hazard: 'Trapped / Engulfed', icon: '⚠️', stats: 'Confined spaces, trench collapse, silo entrapment', controls: 'Confined space entry permits, gas monitoring, rescue equipment, trench boxes' },
];

const regulations = [
  { ref: 'CDM 2015', desc: 'Construction (Design & Management) Regulations', scope: 'All construction projects' },
  { ref: 'WAHR 2005', desc: 'Work at Height Regulations', scope: 'Any work where a fall could cause injury' },
  { ref: 'LOLER 1998', desc: 'Lifting Operations and Lifting Equipment Regulations', scope: 'All lifting operations' },
  { ref: 'PUWER 1998', desc: 'Provision and Use of Work Equipment Regulations', scope: 'All work equipment' },
  { ref: 'COSHH 2002', desc: 'Control of Substances Hazardous to Health', scope: 'Chemical & dust exposure' },
  { ref: 'MHSWR 1999', desc: 'Management of Health and Safety at Work Regs', scope: 'Risk assessment framework' },
  { ref: 'KSA OSH', desc: 'Saudi MHRSD Occupational Safety & Health Standards', scope: 'KSA-specific requirements' },
];

const cppSections = [
  { section: 1, title: 'Project Description & Management', content: 'Project overview, key dates, management structure, communication procedures, organizational chart.' },
  { section: 2, title: 'Site Rules & Arrangements', content: 'Site boundaries, working hours, PPE requirements, speed limits, welfare facilities, emergency assembly points.' },
  { section: 3, title: 'Risk Assessments & Method Statements', content: 'Task-specific RAMS, hierarchy of controls, residual risk ratings, review frequency.' },
  { section: 4, title: 'Monitoring & Review', content: 'Safety inspections schedule, KPI tracking, audit programme, management reviews, toolbox talks.' },
  { section: 5, title: 'Welfare & Health Provisions', content: 'Toilets, washing, rest areas, drinking water, first aid, occupational health surveillance.' },
  { section: 6, title: 'Emergency Procedures', content: 'Fire plan, first aid, spill response, evacuation routes, emergency contacts, nearest hospital route.' },
];

const hierarchyOfControls = [
  { level: 1, control: 'Elimination', desc: 'Remove the hazard completely', effectiveness: '100%', color: 'bg-green-500' },
  { level: 2, control: 'Substitution', desc: 'Replace with less hazardous alternative', effectiveness: '~90%', color: 'bg-green-400' },
  { level: 3, control: 'Engineering Controls', desc: 'Isolate people from the hazard', effectiveness: '~75%', color: 'bg-yellow-400' },
  { level: 4, control: 'Administrative Controls', desc: 'Procedures, training, signage', effectiveness: '~50%', color: 'bg-orange-400' },
  { level: 5, control: 'PPE', desc: 'Last resort – personal protective equipment', effectiveness: '~25%', color: 'bg-red-400' },
];

const highRiskActivities = [
  { activity: 'Deep excavations (>1.5m)', permit: 'Excavation Permit', riskLevel: 'Critical', controls: 'Shoring, edge protection, gas monitoring' },
  { activity: 'Crane lifting operations', permit: 'Lift Plan + PTW', riskLevel: 'Critical', controls: 'Appointed person, lift plan, exclusion zone' },
  { activity: 'Hot works (welding, cutting)', permit: 'Hot Work Permit', riskLevel: 'High', controls: 'Fire watch, fire extinguisher, 30-min post-work check' },
  { activity: 'Roof work / edge work', permit: 'WAH Permit', riskLevel: 'Critical', controls: 'Edge protection, harness, rescue plan' },
  { activity: 'Confined space entry', permit: 'Confined Space Permit', riskLevel: 'Critical', controls: 'Gas testing, rescue team, communication, ventilation' },
  { activity: 'Work over/near water', permit: 'Water Work Permit', riskLevel: 'High', controls: 'Life jackets, rescue boat, edge barriers' },
  { activity: 'Demolition / structural alteration', permit: 'Demolition Plan', riskLevel: 'Critical', controls: 'Structural survey, exclusion zones, sequential demolition' },
  { activity: 'HV electrical work', permit: 'LOTO + Electrical Permit', riskLevel: 'Critical', controls: 'Isolation, proving dead, personal locks' },
  { activity: 'Asbestos removal', permit: 'Licensed Contractor', riskLevel: 'Critical', controls: 'Carcinogenic fibres, enclosure, air monitoring' },
  { activity: 'Temporary works', permit: 'TW Designer Approval', riskLevel: 'Critical', controls: 'Structural collapse prevention, design check' },
];

const environmentalAspects = [
  { aspect: 'Concrete washout', impact: 'Water pollution, pH', control: 'Washout pit, no drain to watercourse' },
  { aspect: 'Fuel / Oil storage', impact: 'Soil / groundwater contamination', control: 'Bunded stores (110% capacity), drip trays' },
  { aspect: 'Noise & vibration', impact: 'Nuisance, occupational health', control: 'BS 5228, monitoring, Section 60 notice' },
  { aspect: 'Dust (silica)', impact: 'Respiratory disease', control: 'LEV, RPE FFP3, H&S Silica Campaign' },
  { aspect: 'Waste disposal', impact: 'Illegal fly-tipping offence', control: 'Duty of care, registered carriers, manifests' },
  { aspect: 'Protected species', impact: 'Ecological offence', control: 'Ecological survey, working method, licence' },
];

const dailyWeeklyRoutine = [
  { period: 'Daily Start-of-Shift', tasks: 'Toolbox talk, site inspection, PTW review, plant pre-use checks' },
  { period: 'Weekly', tasks: 'Site safety inspection (Site Manager + Safety Officer), review near misses, check welfare' },
  { period: 'Monthly', tasks: 'Safety Committee meeting, audit sub-contractors, update CPP, management review' },
  { period: 'Inductions', tasks: 'Every new worker MUST have site induction before starting. Record name, date, signature. No exceptions.' },
  { period: 'After Every Incident', tasks: 'Secure scene, first aid, report, investigate, implement corrective action, close-out' },
];

const lotoSteps = [
  'Notify all affected personnel',
  'Identify ALL energy sources (electrical, hydraulic, pneumatic, gravity, thermal)',
  'Shut down equipment normally',
  'Isolate all energy sources — apply LOCK to each isolator',
  'Release stored/residual energy (bleed, vent, drain, block)',
  'VERIFY ZERO ENERGY STATE — test and confirm safe before work',
];

const environmentalIncidents = [
  { type: 'Oil / Chemical Spill', response: 'Deploy spill kit immediately — do NOT allow entry to drains. Report to Environment Agency if spill reaches controlled waters.' },
  { type: 'Fire (contaminated)', response: 'Prevent contaminated firewater entering drains. Inform EA if watercourse affected.' },
  { type: 'Protected Species Found', response: 'Stop work immediately in affected area. Contact ecological consultant before resuming.' },
  { type: 'Air Quality Complaint', response: 'Stop activity, investigate, engage Environmental Health Officer (EHO).' },
];

const permitTypes = [
  { type: 'Hot Work', icon: <Flame className="h-4 w-4 text-red-500" />, duration: '8 hours max', requirements: ['Fire extinguisher present', 'Combustibles cleared 10m radius', 'Fire watch during and 30 min after', 'Gas-free certificate if enclosed area'] },
  { type: 'Electrical Isolation (LOTO)', icon: <Lock className="h-4 w-4 text-yellow-600" />, duration: 'Until work complete', requirements: ['Identify all energy sources', 'Apply personal locks and tags', 'Prove dead before work starts', 'Controlled release procedure'] },
  { type: 'Confined Space', icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, duration: 'Shift-based', requirements: ['Atmospheric testing (O₂, LEL, H₂S, CO)', 'Rescue team on standby', 'Continuous ventilation', 'Communication system active'] },
  { type: 'Excavation', icon: <HardHat className="h-4 w-4 text-yellow-500" />, duration: 'Per excavation', requirements: ['CAT scan for underground services', 'Hand dig within exclusion zone', 'Supervision by competent person', 'Shoring design if >1.2m'] },
  { type: 'Crane / Lifting Operations', icon: <Anchor className="h-4 w-4 text-blue-500" />, duration: 'Per lift plan', requirements: ['Appointed Person supervising', 'Lift plan approved', 'Exclusion zone established', 'Slings/shackles inspected & certified'] },
  { type: 'Work Over Water', icon: <Anchor className="h-4 w-4 text-cyan-500" />, duration: 'Shift-based', requirements: ['Life jackets/buoyancy aids worn', 'Rescue boat available', 'Edge protection installed', 'Buddy system in place'] },
  { type: 'Breaking Containment', icon: <AlertTriangle className="h-4 w-4 text-red-500" />, duration: 'Per operation', requirements: ['Depressurise and vent system', 'Test free of product', 'Gas-free certificate', 'Emergency response available'] },
];

const riddorDeadlines = [
  { event: 'Fatal accident', deadline: 'Immediately by phone', reporting: 'Phone HSE, then written Form F2508 within 10 days' },
  { event: 'Major injury (specified)', deadline: 'Immediately by phone', reporting: 'Phone HSE, then Form F2508 within 10 days' },
  { event: 'Over-7-day incapacitation', deadline: 'Within 15 days', reporting: 'Online Form F2508' },
  { event: 'Dangerous occurrence', deadline: 'Immediately by phone', reporting: 'Phone HSE, then Form F2508 within 10 days' },
  { event: 'Occupational disease', deadline: 'ASAP on diagnosis', reporting: 'Online Form F2508A' },
];

const emergencySteps = [
  { step: 1, title: 'Secure the Scene', actions: ['Ensure own safety first', 'Prevent further injury/damage', 'Isolate hazard if safe to do so', 'Establish a cordon'] },
  { step: 2, title: 'Raise the Alarm', actions: ['Sound site alarm', 'Call emergency services (997/999)', 'Notify Site Manager & HSE Officer', 'Activate emergency response team'] },
  { step: 3, title: 'Administer First Aid', actions: ['Trained first aider to attend', 'Do not move casualty unless danger', 'Provide life-saving treatment', 'Record all actions taken'] },
  { step: 4, title: 'Evacuate if Required', actions: ['Follow evacuation routes', 'Account for all personnel at assembly point', 'Sweep-check buddy system', 'Deny re-entry until all-clear'] },
  { step: 5, title: 'Preserve Evidence', actions: ['Do not disturb the scene', 'Take photographs/video', 'Secure CCTV footage', 'Isolate relevant equipment'] },
  { step: 6, title: 'Investigate & Report', actions: ['Complete incident report form within 24h', 'Root cause analysis (5-Why / Fishbone)', 'Identify corrective actions', 'Report to authorities if RIDDOR-reportable'] },
  { step: 7, title: 'Follow-Up', actions: ['Implement corrective actions', 'Share lessons learned (toolbox talk)', 'Review and update RAMS', 'Support affected workers'] },
];

export default function HSEReferencePanel() {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" /> HSE Reference Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="cdm" className="w-full">
          <TabsList className="w-full justify-start px-4 flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="cdm"><HardHat className="h-3.5 w-3.5 mr-1" />CDM & Regs</TabsTrigger>
            <TabsTrigger value="cpp"><ClipboardList className="h-3.5 w-3.5 mr-1" />CPP & RAMS</TabsTrigger>
            <TabsTrigger value="permits"><FileText className="h-3.5 w-3.5 mr-1" />Permits & RIDDOR</TabsTrigger>
            <TabsTrigger value="emergency"><Siren className="h-3.5 w-3.5 mr-1" />Emergency</TabsTrigger>
          </TabsList>

          {/* ── CDM & Regulations ── */}
          <TabsContent value="cdm" className="px-4 pb-4 space-y-4">
            <h3 className="font-semibold">CDM 2015 – Duty Holders</h3>
            <ScrollArea className="h-[300px]">
              <Accordion type="multiple" className="w-full">
                {cdmDuties.map((d, i) => (
                  <AccordionItem key={i} value={`cdm-${i}`}>
                    <AccordionTrigger className="text-sm font-semibold">{d.role}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {d.duties.map((duty, j) => <li key={j}>{duty}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>

            <h3 className="font-semibold pt-2">Fatal Five Hazards</h3>
            <div className="grid gap-2">
              {fatalFive.map((f, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{f.icon}</span>
                    <span className="font-semibold text-sm">{f.hazard}</span>
                    <Badge variant="destructive" className="text-xs ml-auto">Fatal Risk</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.stats}</p>
                  <p className="text-xs mt-1"><strong>Controls:</strong> {f.controls}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">Key Regulations Reference</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Description</TableHead><TableHead>Scope</TableHead></TableRow></TableHeader>
              <TableBody>
                {regulations.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs font-bold">{r.ref}</TableCell>
                    <TableCell className="text-sm">{r.desc}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.scope}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <h3 className="font-semibold pt-2">HSE KPI Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'RIDDOR Incidents', value: '0', target: 'Target: 0', color: 'text-green-600' },
                { label: 'Near Miss Rate', value: '87%', target: 'Reporting rate', color: 'text-primary' },
                { label: 'Toolbox Talk', value: '94%', target: 'Compliance', color: 'text-primary' },
                { label: 'PPE Compliance', value: '96%', target: 'Site-wide', color: 'text-primary' },
              ].map((kpi, i) => (
                <div key={i} className="p-3 border rounded-lg text-center">
                  <p className="text-xs text-muted-foreground font-mono">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.target}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">Environmental Aspects & Impacts</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Aspect</TableHead><TableHead>Impact</TableHead><TableHead>Control</TableHead></TableRow></TableHeader>
              <TableBody>
                {environmentalAspects.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{e.aspect}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.impact}</TableCell>
                    <TableCell className="text-xs">{e.control}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <h3 className="font-semibold pt-2">Daily / Weekly HSE Routine</h3>
            <div className="grid gap-2">
              {dailyWeeklyRoutine.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-2 border rounded-md">
                  <Badge variant="outline" className="text-xs whitespace-nowrap mt-0.5">{r.period}</Badge>
                  <p className="text-sm text-muted-foreground">{r.tasks}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── CPP & RAMS ── */}
          <TabsContent value="cpp" className="px-4 pb-4 space-y-4">
            <h3 className="font-semibold">Construction Phase Plan Structure</h3>
            <div className="grid gap-2">
              {cppSections.map(s => (
                <div key={s.section} className="flex gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {s.section}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">RAMS – Hierarchy of Controls</h3>
            <div className="space-y-2">
              {hierarchyOfControls.map(h => (
                <div key={h.level} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${h.color} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {h.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{h.control}</span>
                      <Badge variant="outline" className="text-xs">{h.effectiveness}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.desc}</p>
                  </div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${h.color} rounded-full`} style={{ width: h.effectiveness.replace('~', '').replace('%', '') + '%' }} />
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">High-Risk Activity Matrix</h3>
            <ScrollArea className="h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Permit Required</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Key Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highRiskActivities.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{a.activity}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{a.permit}</Badge></TableCell>
                      <TableCell><Badge variant={a.riskLevel === 'Critical' ? 'destructive' : 'default'} className="text-xs">{a.riskLevel}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.controls}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* ── Permits & RIDDOR ── */}
          <TabsContent value="permits" className="px-4 pb-4 space-y-4">
            <h3 className="font-semibold">Permit to Work Types</h3>
            <Accordion type="multiple" className="w-full">
              {permitTypes.map((p, i) => (
                <AccordionItem key={i} value={`ptw-${i}`}>
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2">
                      {p.icon}
                      <span className="font-semibold">{p.type}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{p.duration}</Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {p.requirements.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
              <span className="font-semibold">📋 PTW Lifecycle:</span> Issued → Accepted → In-Progress → Surrendered → Cancelled. Work must stop if conditions change. Never transfer a live PTW to another worker.
            </div>

            <h3 className="font-semibold pt-2">LOTO — Lockout/Tagout Procedure (6 Steps)</h3>
            <div className="grid gap-1">
              {lotoSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded-md">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                  <span className={`text-sm ${i === 3 ? 'text-red-600 font-semibold' : i === 5 ? 'text-green-600 font-semibold' : ''}`}>{s}</span>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">RIDDOR Reporting Deadlines</h3>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Event</TableHead><TableHead>Deadline</TableHead><TableHead>Reporting Method</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {riddorDeadlines.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{r.event}</TableCell>
                    <TableCell><Badge variant={r.deadline.includes('Immediately') ? 'destructive' : 'secondary'} className="text-xs">{r.deadline}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reporting}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Emergency Response ── */}
          <TabsContent value="emergency" className="px-4 pb-4 space-y-3">
            <h3 className="font-semibold">Emergency Response Procedure</h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {emergencySteps.map(s => (
                  <div key={s.step} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {s.step}
                      </div>
                      <span className="font-semibold text-sm">{s.title}</span>
                    </div>
                    <div className="p-3">
                      <ul className="space-y-1">
                        {s.actions.map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <h3 className="font-semibold pt-2">Environmental Incident Response</h3>
            <div className="grid gap-2">
              {environmentalIncidents.map((e, i) => (
                <div key={i} className="flex items-start gap-3 p-2 border rounded-md">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{e.type}</p>
                    <p className="text-xs text-muted-foreground">{e.response}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
