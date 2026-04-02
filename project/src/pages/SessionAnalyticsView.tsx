import React, { useState, useEffect, useMemo, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Filter, 
  MapPin,
  ShieldCheck,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Fix native leaflet icons globally by pointing to CDN
L.Icon.Default.imagePath = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/';

// Types
interface SessionInsight {
  session_id: string;
  user_id: string | null;
  survey_id: string;
  survey_title?: string;
  completion_time: string | null;
  name: string | null;
  email: string | null;
  account_status: string;
  source_account: string;
  ip_address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  screen_resolution: string | null;
  language: string | null;
  total_clicks: number | null;
  time_spent_on_survey: number | null;
  pages_visited: number | null;
  last_active_time: string | null;
}

const FormatDate = ({ dateString }: { dateString: string | null }) => {
  if (!dateString) return <span className="text-gray-400">N/A</span>;
  const date = new Date(dateString);
  return (
    <span className="whitespace-nowrap">
      {date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric'})} {date.toLocaleTimeString("en-US", { hour: '2-digit', minute:'2-digit', hour12: true })}
    </span>
  );
};

export default function SessionAnalyticsDashboard() {
  const [sessions, setSessions] = useState<SessionInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  
  const { hasFeature } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/admin/survey-sessions?limit=500`, {
        headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      } else {
        throw new Error(data.error || 'Failed to load survey sessions');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique survey IDs and fetch their titles for the dropdown
  const uniqueSurveys = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach(s => {
      if (s.survey_id) {
         map.set(s.survey_id, s.survey_title && s.survey_title !== "None" ? s.survey_title : `Survey: ${s.survey_id}`);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [sessions]);

  // Filtered sessions based on dropdown
  const filteredSessions = useMemo(() => {
    if (selectedSurvey === 'all') return sessions;
    return sessions.filter(s => s.survey_id === selectedSurvey);
  }, [sessions, selectedSurvey]);

  // Filter valid locations for map
  const mapMarkers = filteredSessions.filter(s => s.latitude && s.longitude).map(s => ({
    lat: Number(s.latitude),
    lng: Number(s.longitude),
    session: s
  }));

  const mapCenter: [number, number] = mapMarkers.length > 0 
    ? [mapMarkers[0].lat, mapMarkers[0].lng] 
    : [39.8283, -98.5795]; // Default center (US)

  // Native Leaflet Map Integration (Bypasses all react-leaflet build bugs)
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    
    // Initialize map ONCE
    if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current).setView(mapCenter, mapMarkers.length > 0 ? 3 : 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(leafletMap.current);
    } else {
        leafletMap.current.setView(mapCenter, mapMarkers.length > 0 ? 3 : 2);
    }
    
    // Clear old markers
    leafletMap.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            layer.remove();
        }
    });

    // Add new markers from latest filter
    mapMarkers.forEach(m => {
        const marker = L.marker([m.lat, m.lng]).addTo(leafletMap.current!);
        const content = `
           <div style="font-family: sans-serif; font-size: 12px; color: #333;">
              <strong style="display: block; font-size: 14px; margin-bottom: 4px;">${m.session.city || 'Unknown'}, ${m.session.country || 'Unknown'}</strong>
              <span style="color: #666; font-family: monospace;">IP: ${m.session.ip_address}</span>
              <br/>
              <span style="color: #2563eb;">${m.session.survey_title || m.session.survey_id}</span>
           </div>
        `;
        marker.bindPopup(content);
    });
  }, [mapMarkers, mapCenter]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-stone-800 pb-20">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200">
           <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <ShieldCheck className="text-orange-500" />
                Session Intelligence Platform
              </h1>
              <p className="text-sm text-gray-500 mt-1">Real-time tracking of survey interactions and user analytics</p>
           </div>
        </div>

        {/* Survey Separation Box (Filters) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium min-w-[200px]"
              >
                <option value="all">All Surveys</option>
                {uniqueSurveys.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            
            <div className="ml-auto flex gap-4 text-sm bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 font-medium">
              <div className="flex gap-2 items-center">
                 <span className="text-gray-500">Filtered Sessions:</span>
                 <span className="text-blue-600 font-bold">{filteredSessions.length}</span>
              </div>
           </div>
          </div>
        </div>

        {error && (
           <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md shadow-sm">
             Failed to load analytics: {error}
           </div>
        )}

        {/* 1. GEO MAP */}
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm border-gray-200 relative z-0">
           <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center relative z-10">
             <h3 className="text-xs font-bold text-gray-700 tracking-wider uppercase flex items-center gap-2">
               <MapPin size={16} /> 
               Geographic Footprint
             </h3>
           </div>
           
           <div className="w-full relative z-0 bg-gray-100" style={{ height: "400px" }}>
             {!loading && (
                <div ref={mapRef} style={{ height: "400px", width: "100%", zIndex: 0 }} />
             )}
             {loading && (
               <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               </div>
             )}
           </div>
        </div>

        {/* 2. COMPREHENSIVE SESSION LIST WITH HORIZONTAL SCROLL */}
        <div className="bg-white border rounded-xl shadow-sm border-gray-200 flex flex-col">
           <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
             <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                Detailed Session Records
             </h3>
             <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 font-medium">
               <Download size={14} /> Export CSV
             </button>
           </div>
           
           <div className="overflow-x-auto w-full pb-4">
             {loading ? (
               <div className="p-12 text-center text-gray-400 animate-pulse">Loading detailed sessions...</div>
             ) : filteredSessions.length === 0 ? (
               <div className="p-12 text-center text-gray-400">No sessions recorded matching this filter.</div>
             ) : (
               <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                 <thead>
                   <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0">
                     <th className="py-3 px-4 sticky left-0 bg-gray-50/90 z-20 shadow-[1px_0_0_0_#e5e7eb]">Session ID</th>
                     <th className="py-3 px-4">User ID</th>
                     <th className="py-3 px-4 border-r border-gray-200">Survey Name</th>
                     
                     <th className="py-3 px-4 bg-blue-50/50 text-blue-800">Completion Time</th>
                     <th className="py-3 px-4 bg-blue-50/50 text-blue-800 border-r border-blue-100">Last Active Time</th>
                     
                     <th className="py-3 px-4 bg-orange-50/50 text-orange-800">IP Address</th>
                     <th className="py-3 px-4 bg-orange-50/50 text-orange-800">Country</th>
                     <th className="py-3 px-4 bg-orange-50/50 text-orange-800">State</th>
                     <th className="py-3 px-4 bg-orange-50/50 text-orange-800">City</th>
                     <th className="py-3 px-4 bg-orange-50/50 text-orange-800">Lat/Lng</th>
                     <th className="py-3 px-4 bg-orange-50/50 text-orange-800 border-r border-orange-100">Timezone</th>
                     
                     <th className="py-3 px-4 bg-purple-50/50 text-purple-800">Device Type</th>
                     <th className="py-3 px-4 bg-purple-50/50 text-purple-800">OS</th>
                     <th className="py-3 px-4 bg-purple-50/50 text-purple-800">Browser</th>
                     <th className="py-3 px-4 bg-purple-50/50 text-purple-800">Resolution</th>
                     <th className="py-3 px-4 bg-purple-50/50 text-purple-800 border-r border-purple-100">Language</th>
                     
                     <th className="py-3 px-4 bg-emerald-50/50 text-emerald-800">Total Clicks</th>
                     <th className="py-3 px-4 bg-emerald-50/50 text-emerald-800">Time Spent (s)</th>
                     <th className="py-3 px-4 bg-emerald-50/50 text-emerald-800">Pages Visited</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 text-[11px] sm:text-xs">
                   {filteredSessions.map((session, i) => (
                     <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-gray-900 sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] z-10 group-hover:bg-gray-50">
                          {session.session_id.substring(0, 8)}...
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 font-mono">
                          {session.user_id ? session.user_id.substring(0,8) + "..." : "Guest"}
                        </td>
                        <td className="py-2.5 px-4 text-blue-600 font-medium border-r border-gray-100 min-w-[150px] truncate max-w-[200px]">
                          {session.survey_title || session.survey_id}
                        </td>
                        
                        {/* Time Info */}
                        <td className="py-2.5 px-4 text-gray-600 bg-blue-50/10">
                          <FormatDate dateString={session.completion_time} />
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 border-r border-blue-50 bg-blue-50/10">
                          <FormatDate dateString={session.last_active_time} />
                        </td>

                        {/* Location Info */}
                        <td className="py-2.5 px-4 font-mono text-gray-600 bg-orange-50/10">{session.ip_address || "N/A"}</td>
                        <td className="py-2.5 px-4 text-gray-800 font-medium bg-orange-50/10">
                          {session.country || "-"}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 bg-orange-50/10">{session.state || "-"}</td>
                        <td className="py-2.5 px-4 text-gray-600 bg-orange-50/10">{session.city || "-"}</td>
                        <td className="py-2.5 px-4 text-gray-500 font-mono text-[10px] bg-orange-50/10">
                          {session.latitude && session.longitude ? `${session.latitude.toFixed(4)}, ${session.longitude.toFixed(4)}` : "N/A"}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 border-r border-orange-50 bg-orange-50/10">{session.timezone || "-"}</td>

                        {/* Device Info */}
                        <td className="py-2.5 px-4 text-gray-700 capitalize bg-purple-50/10">{session.device_type || "-"}</td>
                        <td className="py-2.5 px-4 text-gray-700 bg-purple-50/10">{session.os || "-"}</td>
                        <td className="py-2.5 px-4 text-gray-700 bg-purple-50/10">{session.browser || "-"}</td>
                        <td className="py-2.5 px-4 text-gray-600 font-mono bg-purple-50/10">{session.screen_resolution || "-"}</td>
                        <td className="py-2.5 px-4 text-gray-600 border-r border-purple-50 bg-purple-50/10">{session.language || "-"}</td>

                        {/* Behavior Info */}
                        <td className="py-2.5 px-4 text-gray-800 font-bold bg-emerald-50/10 text-center">{session.total_clicks || 0}</td>
                        <td className="py-2.5 px-4 text-gray-800 font-bold bg-emerald-50/10 text-center">{session.time_spent_on_survey?.toFixed(1) || "0"}</td>
                        <td className="py-2.5 px-4 text-gray-800 font-bold bg-emerald-50/10 text-center">{session.pages_visited || 1}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
