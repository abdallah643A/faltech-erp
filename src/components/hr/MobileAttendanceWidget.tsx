import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyEmployeeProfile } from '@/hooks/useEmployeeSelfService';
import { useAttendance } from '@/hooks/useAttendance';
import { MapPin, Clock, LogIn, LogOut, Loader2, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function MobileAttendanceWidget() {
  const { myEmployee } = useMyEmployeeProfile();
  const today = new Date().toISOString().split('T')[0];
  const { attendance, checkIn, checkOut } = useAttendance(myEmployee?.id, today, today);
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const todayRecord = attendance.find(a => a.attendance_date === today);
  const hasCheckedIn = !!todayRecord?.check_in_time;
  const hasCheckedOut = !!todayRecord?.check_out_time;

  const getLocation = (): Promise<{ latitude: number; longitude: number; location: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve({ latitude: 0, longitude: 0, location: 'Unknown' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          });
        },
        () => resolve({ latitude: 0, longitude: 0, location: 'Location unavailable' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!myEmployee) return;
    setGettingLocation(true);
    try {
      const loc = await getLocation();
      checkIn.mutate({
        employee_id: myEmployee.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location: loc.location,
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCheckOut = async () => {
    if (!myEmployee) return;
    setGettingLocation(true);
    try {
      const loc = await getLocation();
      checkOut.mutate({
        employee_id: myEmployee.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location: loc.location,
      });
    } finally {
      setGettingLocation(false);
    }
  };

  if (!myEmployee) return null;

  const isLoading = checkIn.isPending || checkOut.isPending || gettingLocation;

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Attendance
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
                <Wifi className="h-3 w-3" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                <WifiOff className="h-3 w-3" /> Offline
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current time display */}
        <div className="text-center py-3">
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {format(currentTime, 'hh:mm:ss a')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Status display */}
        {hasCheckedIn && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <LogIn className="h-3.5 w-3.5 text-green-600" /> Check In
              </span>
              <span className="font-medium">{format(new Date(todayRecord!.check_in_time!), 'hh:mm a')}</span>
            </div>
            {todayRecord?.check_in_location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{todayRecord.check_in_location}</span>
              </div>
            )}
            {hasCheckedOut && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <LogOut className="h-3.5 w-3.5 text-blue-600" /> Check Out
                  </span>
                  <span className="font-medium">{format(new Date(todayRecord!.check_out_time!), 'hh:mm a')}</span>
                </div>
                {todayRecord?.work_hours != null && (
                  <div className="flex items-center justify-between text-sm pt-1 border-t">
                    <span className="text-muted-foreground">Total Hours</span>
                    <span className="font-semibold">{todayRecord.work_hours.toFixed(1)}h</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {!hasCheckedIn ? (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading || !isOnline}
              className="w-full h-14 text-base gap-2"
              size="lg"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Check In
            </Button>
          ) : !hasCheckedOut ? (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading || !isOnline}
              variant="outline"
              className="w-full h-14 text-base gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              size="lg"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              Check Out
            </Button>
          ) : (
            <div className="text-center py-2">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-green-700">Attendance Complete</p>
              <p className="text-xs text-muted-foreground">You've completed your day</p>
            </div>
          )}
        </div>

        {!isOnline && (
          <p className="text-xs text-center text-muted-foreground">
            You're offline. Attendance will be submitted when you're back online.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
