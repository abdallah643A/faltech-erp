import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCPMS } from '@/hooks/useCPMS';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CloudSun, Thermometer, Wind, Droplets, Activity, Plus, Radio, AlertTriangle, Gauge, MapPin, RefreshCw, CloudRain, Sun, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface WeatherLog { id?: string; project_id: string; log_date: string; temperature_high: number; temperature_low: number; humidity_pct: number; wind_speed: number; conditions: string; rain_mm: number; work_impact: string; impact_assessment?: string; }
interface IoTReading { id?: string; project_id: string; sensor_id: string; sensor_type: string; sensor_name: string; location: string; value: number; unit: string; status: string; threshold_min?: number; threshold_max?: number; reading_time: string; }

interface LiveWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rain: number;
  conditions: string;
  icon: string;
}

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  rain: number;
  windMax: number;
  weatherCode: number;
}

const SENSOR_TYPES = [
  { value: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, color: 'text-destructive' },
  { value: 'humidity', label: 'Humidity', unit: '%', icon: Droplets, color: 'text-info' },
  { value: 'noise', label: 'Noise Level', unit: 'dB', icon: Activity, color: 'text-purple-500' },
  { value: 'vibration', label: 'Vibration', unit: 'mm/s', icon: Activity, color: 'text-warning' },
  { value: 'dust', label: 'Dust/PM', unit: 'µg/m³', icon: Wind, color: 'text-muted-foreground' },
  { value: 'gas', label: 'Gas Detection', unit: 'ppm', icon: AlertTriangle, color: 'text-warning' },
];

const impactColors: Record<string, string> = { none: 'bg-green-100 text-green-800', minor: 'bg-yellow-100 text-yellow-800', major: 'bg-orange-100 text-orange-800', stoppage: 'bg-red-100 text-red-800' };
const sensorStatusColors: Record<string, string> = { normal: 'bg-green-100 text-green-800', warning: 'bg-yellow-100 text-yellow-800', critical: 'bg-red-100 text-red-800' };

function getWmoCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 69) return 'Rainy';
  if (code <= 79) return 'Snowy';
  if (code <= 99) return 'Stormy';
  return 'Unknown';
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="h-8 w-8 text-warning" />;
  if (code <= 3) return <Cloud className="h-8 w-8 text-muted-foreground" />;
  if (code <= 69) return <CloudRain className="h-8 w-8 text-info" />;
  return <AlertTriangle className="h-8 w-8 text-destructive" />;
}

function getConstructionAlerts(current: LiveWeather | null, forecast: ForecastDay[]): string[] {
  const alerts: string[] = [];
  if (current) {
    if (current.rain > 5) alerts.push('⚠️ Heavy rain (>5mm) — potential work stoppage');
    if (current.windSpeed > 40) alerts.push('🌬️ High wind (>40 km/h) — crane operations unsafe');
    if (current.temperature > 45) alerts.push('🔥 Extreme heat (>45°C) — mandatory rest periods');
    if (current.temperature > 50) alerts.push('🛑 Dangerous heat (>50°C) — outdoor work prohibited');
  }
  forecast.forEach(d => {
    if (d.rain > 10) alerts.push(`📅 ${d.date}: Heavy rain forecast (${d.rain}mm)`);
    if (d.windMax > 50) alerts.push(`📅 ${d.date}: Strong wind forecast (${d.windMax} km/h)`);
    if (d.tempMax > 48) alerts.push(`📅 ${d.date}: Extreme heat expected (${d.tempMax}°C)`);
  });
  return alerts;
}

export default function CPMSWeatherIoT() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const { toast } = useToast();
  const [weather, setWeather] = useState<WeatherLog[]>([]);
  const [iot, setIoT] = useState<IoTReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showWeatherForm, setShowWeatherForm] = useState(false);
  const [showSensorForm, setShowSensorForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [weatherForm, setWeatherForm] = useState<Partial<WeatherLog>>({ log_date: format(new Date(), 'yyyy-MM-dd'), conditions: 'sunny', work_impact: 'none', temperature_high: 40, temperature_low: 25, humidity_pct: 30, wind_speed: 10, rain_mm: 0 });
  const [sensorForm, setSensorForm] = useState<Partial<IoTReading>>({ sensor_type: 'temperature', status: 'normal', value: 0, reading_time: new Date().toISOString() });

  // Live weather state
  const [city, setCity] = useState(() => localStorage.getItem('cpms-weather-city') || 'Riyadh');
  const [lat, setLat] = useState(() => localStorage.getItem('cpms-weather-lat') || '24.7136');
  const [lon, setLon] = useState(() => localStorage.getItem('cpms-weather-lon') || '46.6753');
  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const fetchLiveWeather = async () => {
    setWeatherLoading(true);
    try {
      // Using Open-Meteo (free, no API key)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,rain,weather_code&daily=temperature_2m_max,temperature_2m_min,rain_sum,wind_speed_10m_max,weather_code&timezone=auto&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.current) {
        setLiveWeather({
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          rain: data.current.rain,
          conditions: getWmoCondition(data.current.weather_code),
          icon: String(data.current.weather_code),
        });
      }

      if (data.daily) {
        const days: ForecastDay[] = data.daily.time.map((d: string, i: number) => ({
          date: d,
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          rain: data.daily.rain_sum[i],
          windMax: data.daily.wind_speed_10m_max[i],
          weatherCode: data.daily.weather_code[i],
        }));
        setForecast(days);
      }
    } catch (err) {
      toast({ title: 'Weather fetch failed', variant: 'destructive' });
    }
    setWeatherLoading(false);
  };

  const saveLocation = () => {
    localStorage.setItem('cpms-weather-city', city);
    localStorage.setItem('cpms-weather-lat', lat);
    localStorage.setItem('cpms-weather-lon', lon);
    setShowLocationForm(false);
    fetchLiveWeather();
    toast({ title: `Weather location set to ${city}` });
  };

  const fetchAll = async () => {
    setLoading(true);
    const [wRes, iRes] = await Promise.all([
      supabase.from('cpms_weather_logs' as any).select('*').order('log_date', { ascending: false }).limit(200),
      supabase.from('cpms_iot_readings' as any).select('*').order('reading_time', { ascending: false }).limit(500),
    ]);
    setWeather((wRes.data || []) as any[]);
    setIoT((iRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); fetchLiveWeather(); }, []);

  const filteredWeather = selectedProject === 'all' ? weather : weather.filter(w => w.project_id === selectedProject);
  const filteredIoT = selectedProject === 'all' ? iot : iot.filter(i => i.project_id === selectedProject);

  const handleSaveWeather = async () => {
    if (!weatherForm.project_id) return;
    await supabase.from('cpms_weather_logs' as any).insert(weatherForm as any);
    toast({ title: 'Weather log saved' });
    setShowWeatherForm(false);
    fetchAll();
  };

  const handleSaveSensor = async () => {
    if (!sensorForm.project_id || !sensorForm.sensor_id) return;
    const sType = SENSOR_TYPES.find(s => s.value === sensorForm.sensor_type);
    let status = 'normal';
    if (sensorForm.threshold_max && sensorForm.value! > sensorForm.threshold_max) status = 'critical';
    else if (sensorForm.threshold_min && sensorForm.value! < sensorForm.threshold_min) status = 'warning';
    await supabase.from('cpms_iot_readings' as any).insert({ ...sensorForm, unit: sType?.unit, status } as any);
    toast({ title: 'Sensor reading recorded' });
    setShowSensorForm(false);
    fetchAll();
  };

  const weatherChartData = [...filteredWeather].reverse().slice(-30).map(w => ({
    date: w.log_date, high: w.temperature_high, low: w.temperature_low, humidity: w.humidity_pct, wind: w.wind_speed,
  }));

  const latestBySensor = filteredIoT.reduce((acc: Record<string, IoTReading>, r) => {
    if (!acc[r.sensor_id] || new Date(r.reading_time) > new Date(acc[r.sensor_id].reading_time)) acc[r.sensor_id] = r;
    return acc;
  }, {});

  const criticalSensors = Object.values(latestBySensor).filter(s => s.status === 'critical').length;
  const warningSensors = Object.values(latestBySensor).filter(s => s.status === 'warning').length;
  const stoppageDays = filteredWeather.filter(w => w.work_impact === 'stoppage').length;
  const constructionAlerts = getConstructionAlerts(liveWeather, forecast);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><CloudSun className="h-6 w-6 text-primary" /> Weather & IoT Monitoring</h1>
          <p className="text-sm text-muted-foreground">الطقس وأجهزة الاستشعار – Live weather + environmental sensors</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLocationForm(true)}>
          <MapPin className="h-4 w-4 mr-1" /> {city}
        </Button>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Live Weather Banner */}
      {liveWeather && (
        <Card className="border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {getWeatherIcon(parseInt(liveWeather.icon))}
                <div>
                  <p className="text-2xl font-bold">{liveWeather.temperature}°C</p>
                  <p className="text-sm text-muted-foreground">{liveWeather.conditions} — {city}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <Droplets className="h-4 w-4 mx-auto text-info" />
                  <p className="text-sm font-medium">{liveWeather.humidity}%</p>
                  <p className="text-[10px] text-muted-foreground">Humidity</p>
                </div>
                <div className="text-center">
                  <Wind className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">{liveWeather.windSpeed} km/h</p>
                  <p className="text-[10px] text-muted-foreground">Wind</p>
                </div>
                <div className="text-center">
                  <CloudRain className="h-4 w-4 mx-auto text-info" />
                  <p className="text-sm font-medium">{liveWeather.rain} mm</p>
                  <p className="text-[10px] text-muted-foreground">Rain</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchLiveWeather} disabled={weatherLoading}>
                <RefreshCw className={`h-4 w-4 ${weatherLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Construction Alerts */}
      {constructionAlerts.length > 0 && (
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-destructive mb-2">⚠️ Construction Impact Alerts</p>
            <ul className="space-y-1">
              {constructionAlerts.map((a, i) => <li key={i} className="text-sm">{a}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Forecast */}
      {forecast.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">7-Day Forecast — {city}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {forecast.map((d, i) => {
                const hasAlert = d.rain > 5 || d.windMax > 40 || d.tempMax > 45;
                return (
                  <div key={i} className={`text-center p-2 rounded-lg border ${hasAlert ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                    <p className="text-xs font-medium">{format(new Date(d.date), 'EEE')}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(d.date), 'dd/MM')}</p>
                    <div className="my-1">{getWeatherIcon(d.weatherCode)}</div>
                    <p className="text-sm font-bold">{d.tempMax}°</p>
                    <p className="text-xs text-muted-foreground">{d.tempMin}°</p>
                    {d.rain > 0 && <p className="text-[10px] text-info">💧{d.rain}mm</p>}
                    {d.windMax > 30 && <p className="text-[10px] text-muted-foreground">💨{d.windMax}</p>}
                    {hasAlert && <Badge variant="destructive" className="text-[8px] mt-1 h-4">Alert</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><Thermometer className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Weather Logs</p><p className="text-lg font-bold">{filteredWeather.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Stoppage Days</p><p className="text-lg font-bold text-destructive">{stoppageDays}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><Radio className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Active Sensors</p><p className="text-lg font-bold">{Object.keys(latestBySensor).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center"><Gauge className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-xs text-muted-foreground">Alerts</p><p className="text-lg font-bold">{criticalSensors} <span className="text-xs font-normal text-muted-foreground">critical</span> · {warningSensors} <span className="text-xs font-normal text-muted-foreground">warn</span></p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="weather">
        <TabsList>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="iot">IoT Sensors ({Object.keys(latestBySensor).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="weather" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowWeatherForm(true)}><Plus className="h-4 w-4 mr-1" /> Log Weather</Button></div>
          {weatherChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Temperature & Conditions (Last 30 days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={weatherChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="high" name="High °C" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="low" name="Low °C" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.date')}</TableHead><TableHead>Temp</TableHead><TableHead>Humidity</TableHead><TableHead>Wind</TableHead><TableHead>Rain</TableHead><TableHead>Conditions</TableHead><TableHead>Impact</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredWeather.slice(0, 30).map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs">{w.log_date}</TableCell>
                      <TableCell className="text-xs">{w.temperature_low}–{w.temperature_high}°C</TableCell>
                      <TableCell className="text-xs">{w.humidity_pct}%</TableCell>
                      <TableCell className="text-xs">{w.wind_speed} km/h</TableCell>
                      <TableCell className="text-xs">{w.rain_mm} mm</TableCell>
                      <TableCell className="capitalize text-xs">{w.conditions}</TableCell>
                      <TableCell><Badge className={`text-xs ${impactColors[w.work_impact] || ''}`}>{w.work_impact}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iot" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setShowSensorForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Reading</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(latestBySensor).map((s: any) => {
              const sType = SENSOR_TYPES.find(st => st.value === s.sensor_type);
              const Icon = sType?.icon || Activity;
              const pct = s.threshold_max ? Math.min(100, (s.value / s.threshold_max) * 100) : 50;
              return (
                <Card key={s.sensor_id} className={`border-l-4 ${s.status === 'critical' ? 'border-l-destructive' : s.status === 'warning' ? 'border-l-warning' : 'border-l-success'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${sType?.color || ''}`} />
                        <div>
                          <p className="text-sm font-medium">{s.sensor_name || s.sensor_id}</p>
                          <p className="text-xs text-muted-foreground">{s.location || 'Unknown'}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${sensorStatusColors[s.status] || ''}`}>{s.status}</Badge>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{s.value}</span>
                      <span className="text-sm text-muted-foreground mb-0.5">{s.unit}</span>
                    </div>
                    {s.threshold_max && <Progress value={pct} className={`h-1.5 mt-2 ${s.status === 'critical' ? '[&>div]:bg-destructive' : ''}`} />}
                    <p className="text-xs text-muted-foreground mt-1">{s.reading_time ? format(new Date(s.reading_time), 'dd MMM HH:mm') : ''}</p>
                  </CardContent>
                </Card>
              );
            })}
            {Object.keys(latestBySensor).length === 0 && <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No sensor data yet</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Location Settings Dialog */}
      <Dialog open={showLocationForm} onOpenChange={setShowLocationForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Weather Location</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>City Name</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Riyadh" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitude</Label><Input value={lat} onChange={e => setLat(e.target.value)} placeholder="24.7136" /></div>
              <div><Label>Longitude</Label><Input value={lon} onChange={e => setLon(e.target.value)} placeholder="46.6753" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Common KSA coordinates: Riyadh (24.71, 46.68), Jeddah (21.54, 39.17), Dammam (26.43, 50.10)</p>
            <Button onClick={saveLocation} className="w-full">Save & Refresh</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weather Form */}
      <Dialog open={showWeatherForm} onOpenChange={setShowWeatherForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Weather Conditions</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={weatherForm.project_id} onValueChange={v => setWeatherForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('common.date')}</Label><Input type="date" value={weatherForm.log_date} onChange={e => setWeatherForm(f => ({ ...f, log_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Temp High (°C)</Label><Input type="number" value={weatherForm.temperature_high} onChange={e => setWeatherForm(f => ({ ...f, temperature_high: parseFloat(e.target.value) }))} /></div>
              <div><Label>Temp Low (°C)</Label><Input type="number" value={weatherForm.temperature_low} onChange={e => setWeatherForm(f => ({ ...f, temperature_low: parseFloat(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Humidity %</Label><Input type="number" value={weatherForm.humidity_pct} onChange={e => setWeatherForm(f => ({ ...f, humidity_pct: parseFloat(e.target.value) }))} /></div>
              <div><Label>Wind km/h</Label><Input type="number" value={weatherForm.wind_speed} onChange={e => setWeatherForm(f => ({ ...f, wind_speed: parseFloat(e.target.value) }))} /></div>
              <div><Label>Rain mm</Label><Input type="number" value={weatherForm.rain_mm} onChange={e => setWeatherForm(f => ({ ...f, rain_mm: parseFloat(e.target.value) }))} /></div>
            </div>
            <div><Label>Conditions</Label>
              <Select value={weatherForm.conditions} onValueChange={v => setWeatherForm(f => ({ ...f, conditions: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunny">Sunny</SelectItem><SelectItem value="cloudy">Cloudy</SelectItem>
                  <SelectItem value="rainy">Rainy</SelectItem><SelectItem value="stormy">Stormy</SelectItem>
                  <SelectItem value="dusty">Dusty</SelectItem><SelectItem value="foggy">Foggy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Work Impact</Label>
              <Select value={weatherForm.work_impact} onValueChange={v => setWeatherForm(f => ({ ...f, work_impact: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem><SelectItem value="minor">Minor Delay</SelectItem>
                  <SelectItem value="major">Major Delay</SelectItem><SelectItem value="stoppage">Work Stoppage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveWeather} className="w-full">Save Weather Log</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sensor Form */}
      <Dialog open={showSensorForm} onOpenChange={setShowSensorForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Sensor Reading</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={sensorForm.project_id} onValueChange={v => setSensorForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sensor ID</Label><Input value={sensorForm.sensor_id || ''} onChange={e => setSensorForm(f => ({ ...f, sensor_id: e.target.value }))} placeholder="e.g. TEMP-001" /></div>
              <div><Label>Sensor Name</Label><Input value={sensorForm.sensor_name || ''} onChange={e => setSensorForm(f => ({ ...f, sensor_name: e.target.value }))} placeholder="e.g. Crane Area Temp" /></div>
            </div>
            <div><Label>Sensor Type</Label>
              <Select value={sensorForm.sensor_type} onValueChange={v => setSensorForm(f => ({ ...f, sensor_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SENSOR_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label} ({s.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={sensorForm.location || ''} onChange={e => setSensorForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Floor 3, Zone A" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Value</Label><Input type="number" value={sensorForm.value} onChange={e => setSensorForm(f => ({ ...f, value: parseFloat(e.target.value) }))} /></div>
              <div><Label>Min Threshold</Label><Input type="number" value={sensorForm.threshold_min || ''} onChange={e => setSensorForm(f => ({ ...f, threshold_min: parseFloat(e.target.value) || undefined }))} /></div>
              <div><Label>Max Threshold</Label><Input type="number" value={sensorForm.threshold_max || ''} onChange={e => setSensorForm(f => ({ ...f, threshold_max: parseFloat(e.target.value) || undefined }))} /></div>
            </div>
            <Button onClick={handleSaveSensor} className="w-full">Save Sensor Reading</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
