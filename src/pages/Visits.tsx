import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  MapPin, 
  Camera, 
  Navigation, 
  Loader2, 
  Image as ImageIcon,
  Clock,
  Building2,
  X
} from 'lucide-react';

interface Visit {
  id: string;
  sales_rep_id: string;
  business_partner_id: string | null;
  visit_date: string;
  latitude: number;
  longitude: number;
  address: string | null;
  visit_type: string;
  notes: string | null;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  created_at: string;
  business_partners?: {
    card_name: string;
    card_code: string;
  } | null;
}

interface VisitImage {
  id: string;
  visit_id: string;
  image_url: string;
  caption: string | null;
  signedUrl?: string;
}

export default function Visits() {
  const { direction } = useLanguage();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  
  const [newVisit, setNewVisit] = useState({
    business_partner_id: '',
    latitude: 0,
    longitude: 0,
    address: '',
    visit_type: 'routine',
    notes: '',
  });

  // Fetch visits
  const { data: visits, isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          business_partners (card_name, card_code)
        `)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      return data as Visit[];
    },
    enabled: hasAnyRole(['admin', 'manager', 'sales_rep']),
  });

  // Fetch business partners for dropdown
  const { data: businessPartners } = useQuery({
    queryKey: ['business-partners-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('id, card_code, card_name')
        .eq('status', 'active')
        .order('card_name');

      if (error) throw error;
      return data;
    },
  });

  // Fetch images for selected visit with signed URLs
  const { data: visitImages } = useQuery({
    queryKey: ['visit-images', selectedVisit?.id],
    queryFn: async () => {
      if (!selectedVisit) return [];
      const { data, error } = await supabase
        .from('visit_images')
        .select('*')
        .eq('visit_id', selectedVisit.id);

      if (error) throw error;
      
      // Generate signed URLs for each image
      const imagesWithSignedUrls = await Promise.all(
        (data as VisitImage[]).map(async (img) => {
          // Extract the file path from the stored URL or use the URL as path
          const filePath = img.image_url.includes('/visit-images/')
            ? img.image_url.split('/visit-images/').pop() || img.image_url
            : img.image_url;
          
          const { data: signedData } = await supabase.storage
            .from('visit-images')
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          return {
            ...img,
            signedUrl: signedData?.signedUrl || img.image_url,
          };
        })
      );
      
      return imagesWithSignedUrls;
    },
    enabled: !!selectedVisit,
  });

  // Create visit mutation
  const createVisitMutation = useMutation({
    mutationFn: async (visitData: typeof newVisit) => {
      if (!user) throw new Error('Not authenticated');

      // Create visit
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          sales_rep_id: user.id,
          business_partner_id: visitData.business_partner_id || null,
          latitude: visitData.latitude,
          longitude: visitData.longitude,
          address: visitData.address,
          visit_type: visitData.visit_type,
          notes: visitData.notes,
          check_in_time: new Date().toISOString(),
          status: 'completed',
        })
        .select()
        .single();

      if (visitError) throw visitError;

      // Upload pending images - store file path instead of public URL
      for (const file of pendingImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${visit.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('visit-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Store the file path, not the public URL (bucket is now private)
        await supabase
          .from('visit_images')
          .insert({
            visit_id: visit.id,
            image_url: fileName, // Store the file path for signed URL generation
          });
      }

      return visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast({
        title: 'Visit Recorded',
        description: 'Your visit has been successfully logged.',
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to record visit: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setNewVisit({
      business_partner_id: '',
      latitude: 0,
      longitude: 0,
      address: '',
      visit_type: 'routine',
      notes: '',
    });
    setPendingImages([]);
  };

  const captureLocation = () => {
    setIsCapturingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      setIsCapturingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setNewVisit(prev => ({
          ...prev,
          latitude,
          longitude,
        }));

        // Try to reverse geocode
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) {
            setNewVisit(prev => ({
              ...prev,
              address: data.display_name,
            }));
          }
        } catch (error) {
          console.error('Failed to reverse geocode:', error);
        }

        setIsCapturingLocation(false);
        toast({
          title: 'Location Captured',
          description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
        });
      },
      (error) => {
        setIsCapturingLocation(false);
        toast({
          title: 'Error',
          description: `Failed to get location: ${error.message}`,
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (newVisit.latitude === 0 && newVisit.longitude === 0) {
      toast({
        title: 'Location Required',
        description: 'Please capture your GPS location before submitting.',
        variant: 'destructive',
      });
      return;
    }
    createVisitMutation.mutate(newVisit);
  };

  const getVisitTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      routine: 'outline',
      follow_up: 'secondary',
      sales: 'default',
      support: 'secondary',
      collection: 'outline',
    };
    return <Badge variant={variants[type] || 'default'}>{type.replace('_', ' ')}</Badge>;
  };

  const stats = {
    total: visits?.length || 0,
    today: visits?.filter(v => 
      new Date(v.visit_date).toDateString() === new Date().toDateString()
    ).length || 0,
    thisWeek: visits?.filter(v => {
      const visitDate = new Date(v.visit_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return visitDate >= weekAgo;
    }).length || 0,
  };

  return (
    <div className="space-y-4 md:space-y-6" dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Visit Tracking</h1>
          <p className="text-xs md:text-sm text-muted-foreground">GPS-enabled sales rep visit management</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              Record Visit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record New Visit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* GPS Location */}
              <div className="space-y-2">
                <Label>GPS Location *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={captureLocation}
                    disabled={isCapturingLocation}
                    className="flex-1"
                  >
                    {isCapturingLocation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4 mr-2" />
                    )}
                    {isCapturingLocation ? 'Capturing...' : 'Capture Location'}
                  </Button>
                </div>
                {newVisit.latitude !== 0 && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {newVisit.latitude.toFixed(6)}, {newVisit.longitude.toFixed(6)}
                  </div>
                )}
                {newVisit.address && (
                  <p className="text-sm text-muted-foreground">{newVisit.address}</p>
                )}
              </div>

              {/* Business Partner */}
              <div className="space-y-2">
                <Label>Business Partner</Label>
                <Select
                  value={newVisit.business_partner_id}
                  onValueChange={(v) => setNewVisit(prev => ({ ...prev, business_partner_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessPartners?.map(bp => (
                      <SelectItem key={bp.id} value={bp.id}>
                        {bp.card_code} - {bp.card_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visit Type */}
              <div className="space-y-2">
                <Label>Visit Type</Label>
                <Select
                  value={newVisit.visit_type}
                  onValueChange={(v) => setNewVisit(prev => ({ ...prev, visit_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine Visit</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="sales">Sales Visit</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="collection">Collection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newVisit.notes}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add visit notes..."
                  rows={3}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Photos</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  capture="environment"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos
                </Button>
                {pendingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pendingImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-5 w-5"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createVisitMutation.isPending}
                className="w-full"
              >
                {createVisitMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Visit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Visits Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No visits recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  visits?.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>
                        {new Date(visit.visit_date).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(visit.visit_date).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {visit.business_partners ? (
                          <div>
                            <div className="font-medium">{visit.business_partners.card_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {visit.business_partners.card_code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getVisitTypeBadge(visit.visit_type)}</TableCell>
                      <TableCell>
                        <a
                          href={`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          View Map
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {visit.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVisit(visit)}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Images Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visit Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {visitImages?.length === 0 ? (
              <p className="col-span-2 text-center text-muted-foreground py-4">
                No photos for this visit
              </p>
            ) : (
              visitImages?.map((img) => (
                <img
                  key={img.id}
                  src={img.signedUrl || img.image_url}
                  alt={img.caption || 'Visit photo'}
                  className="w-full h-32 object-cover rounded-md"
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
