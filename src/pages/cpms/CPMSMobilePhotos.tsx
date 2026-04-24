import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCPMSSitePhotos } from '@/hooks/useCPMSSitePhotos';
import { useCPMS } from '@/hooks/useCPMS';
import { MobileBottomNav } from '@/components/cpms/mobile/MobileBottomNav';
import { Camera, ArrowLeft, Grid3X3, Clock, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORY_COLORS: Record<string, string> = {
  progress: 'bg-blue-100 text-blue-700', issue: 'bg-red-100 text-red-700',
  before: 'bg-amber-100 text-amber-700', after: 'bg-emerald-100 text-emerald-700',
  safety: 'bg-orange-100 text-orange-700', material: 'bg-purple-100 text-purple-700',
  equipment: 'bg-gray-100 text-gray-700', other: 'bg-slate-100 text-slate-700',
};

export default function CPMSMobilePhotos() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { photos, loading, uploading, fetchPhotos, uploadPhoto, PHOTO_CATEGORIES } = useCPMSSitePhotos();
  const { projects } = useCPMS();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('progress');
  const [projectId, setProjectId] = useState('');
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('all');

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setShowUpload(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !projectId) return;
    await uploadPhoto(selectedFile, { projectId, caption, category });
    setShowUpload(false);
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setCategory('progress');
  };

  const filteredPhotos = filterCat === 'all' ? photos : photos.filter(p => p.category === filterCat);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cpms/mobile')} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Site Photos</h1>
        </div>
        <Badge variant="secondary">{photos.length} photos</Badge>
      </div>

      {/* Camera Button */}
      <div className="p-4">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <Button onClick={() => fileRef.current?.click()} className="w-full min-h-[56px] text-base bg-blue-600 hover:bg-blue-700">
          <Camera className="h-5 w-5 mr-2" /> Take Photo
        </Button>
      </div>

      {/* Category Filter */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2">
        <Badge variant={filterCat === 'all' ? 'default' : 'outline'} className="cursor-pointer shrink-0" onClick={() => setFilterCat('all')}>All</Badge>
        {PHOTO_CATEGORIES.map(cat => (
          <Badge key={cat} variant={filterCat === cat ? 'default' : 'outline'} className="cursor-pointer shrink-0 capitalize" onClick={() => setFilterCat(cat)}>{cat}</Badge>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {filteredPhotos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer" onClick={() => setViewPhoto(photo.photo_url)}>
              <img src={photo.photo_url} alt={photo.caption || 'Site photo'} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                <Badge className={`text-[9px] ${CATEGORY_COLORS[photo.category] || ''}`}>{photo.category}</Badge>
              </div>
            </div>
          ))}
          {filteredPhotos.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No photos yet. Tap "Take Photo" to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload Photo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {preview && (
              <div className="relative rounded-lg overflow-hidden">
                <img src={preview} alt="Preview" className="w-full max-h-48 object-cover" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe the photo..." className="min-h-[48px] text-base" />
            </div>
            <Button onClick={handleUpload} disabled={!projectId || uploading} className="w-full min-h-[52px] text-base">
              <Upload className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Photo Dialog */}
      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-lg p-0">
          {viewPhoto && <img src={viewPhoto} alt="Full size" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}
