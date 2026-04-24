import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

// Fix default marker icon issue with Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Visit {
  id: string;
  sales_rep_id: string;
  latitude: number;
  longitude: number;
  address: string | null;
  visit_type: string;
  visit_date: string;
  status: string;
  business_partners?: {
    card_name: string;
    card_code: string;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface VisitMapProps {
  visits: Visit[];
  isLoading?: boolean;
  height?: string;
}

const visitTypeColors: Record<string, string> = {
  routine: '#3B82F6',
  follow_up: '#8B5CF6',
  sales: '#10B981',
  support: '#F59E0B',
  collection: '#EF4444',
};

export function VisitMap({ visits, isLoading, height = '400px' }: VisitMapProps) {
  const { t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || isLoading) return;

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([24.7136, 46.6753], 6); // Default to Saudi Arabia

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add markers for each visit
    if (visits.length > 0) {
      const bounds = L.latLngBounds([]);

      visits.forEach((visit) => {
        const color = visitTypeColors[visit.visit_type] || '#6B7280';
        
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([visit.latitude, visit.longitude], { icon: customIcon })
          .addTo(mapRef.current!);

        const popupContent = `
          <div style="min-width: 200px;">
            <strong>${visit.business_partners?.card_name || 'Unknown Customer'}</strong><br/>
            <span style="color: #666;">${visit.business_partners?.card_code || ''}</span><br/>
            <hr style="margin: 8px 0;"/>
            <strong>Sales Rep:</strong> ${visit.profiles?.full_name || 'Unknown'}<br/>
            <strong>Type:</strong> <span style="color: ${color}; text-transform: capitalize;">${visit.visit_type}</span><br/>
            <strong>Date:</strong> ${new Date(visit.visit_date).toLocaleDateString()}<br/>
            <strong>Status:</strong> ${visit.status}<br/>
            ${visit.address ? `<strong>Address:</strong> ${visit.address}` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);
        bounds.extend([visit.latitude, visit.longitude]);
      });

      // Fit map to show all markers
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      // Cleanup is handled by clearing markers on next render
    };
  }, [visits, isLoading]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          {t('visits.map') || 'Visit Locations'}
          <div className="flex gap-2 flex-wrap text-xs font-normal">
            {Object.entries(visitTypeColors).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div 
            className="flex items-center justify-center bg-muted rounded-lg animate-pulse"
            style={{ height }}
          >
            <span className="text-muted-foreground">Loading map...</span>
          </div>
        ) : (
          <div 
            ref={mapContainerRef} 
            style={{ height, width: '100%' }}
            className="rounded-lg overflow-hidden"
          />
        )}
      </CardContent>
    </Card>
  );
}
