import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TripPlanResponse, TripSegment } from '../../types/trip';

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Convert [lon, lat] (GeoJSON) → [lat, lon] (Leaflet)
const toLLArr = (coords: [number, number][]): [number, number][] =>
  coords.map(([lon, lat]) => [lat, lon]);

function makeIcon(emoji: string, bg: string) {
  return L.divIcon({
    html: `<div style="background:${bg};border:2px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

function stopLabel(seg: TripSegment): string {
  const d = new Date(seg.start_iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

interface Props {
  plan: TripPlanResponse;
}

export function MapView({ plan }: Props) {
  const cpCoords = toLLArr(plan.route_geometry.current_to_pickup);
  const pdCoords = toLLArr(plan.route_geometry.pickup_to_dropoff);
  const allCoords = [...cpCoords, ...pdCoords];

  const stopSegments = plan.segments.filter(
    s => s.notes && ['Fuel stop', 'Pickup', 'Dropoff', '30-min mandatory break', 'Mandatory 10-hr rest', '34-hr restart'].some(n => s.notes.includes(n))
  );

  const iconFor = (notes: string) => {
    if (notes.includes('Fuel')) return makeIcon('⛽', '#f59e0b');
    if (notes.includes('Pickup')) return makeIcon('📦', '#3b82f6');
    if (notes.includes('Dropoff')) return makeIcon('🏁', '#10b981');
    if (notes.includes('break')) return makeIcon('☕', '#8b5cf6');
    if (notes.includes('rest') || notes.includes('restart')) return makeIcon('😴', '#6366f1');
    return makeIcon('📍', '#64748b');
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      <MapContainer
        center={[39.5, -95]}
        zoom={5}
        style={{ height: '420px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds positions={allCoords} />

        {cpCoords.length > 0 && (
          <Polyline positions={cpCoords} color="#3b82f6" weight={5} opacity={0.8} />
        )}
        {pdCoords.length > 0 && (
          <Polyline positions={pdCoords} color="#10b981" weight={5} opacity={0.8} />
        )}

        {/* Start marker */}
        <Marker
          position={[plan.geocoded.current.lat, plan.geocoded.current.lon]}
          icon={makeIcon('🚛', '#1d4ed8')}
        >
          <Popup>
            <b>Start</b><br />{plan.geocoded.current.display_name}
          </Popup>
        </Marker>

        {/* Pickup marker */}
        <Marker
          position={[plan.geocoded.pickup.lat, plan.geocoded.pickup.lon]}
          icon={makeIcon('📦', '#2563eb')}
        >
          <Popup>
            <b>Pickup</b><br />{plan.geocoded.pickup.display_name}
          </Popup>
        </Marker>

        {/* Dropoff marker */}
        <Marker
          position={[plan.geocoded.dropoff.lat, plan.geocoded.dropoff.lon]}
          icon={makeIcon('🏁', '#059669')}
        >
          <Popup>
            <b>Dropoff</b><br />{plan.geocoded.dropoff.display_name}
          </Popup>
        </Marker>

        {/* Stop markers */}
        {stopSegments.map(seg => (
          <Marker
            key={seg.sequence}
            position={[seg.lat, seg.lon]}
            icon={iconFor(seg.notes)}
          >
            <Popup>
              <b>{seg.notes}</b><br />
              {seg.location_name}<br />
              {stopLabel(seg)}<br />
              <span className="text-gray-500">{seg.duration_hours.toFixed(1)}h stop</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="bg-white px-4 py-2.5 flex flex-wrap gap-4 text-xs text-gray-600 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-1 bg-blue-500 rounded" />
          <span>To Pickup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-1 bg-emerald-500 rounded" />
          <span>To Dropoff</span>
        </div>
        <div className="flex items-center gap-1.5"><span>⛽</span><span>Fuel Stop</span></div>
        <div className="flex items-center gap-1.5"><span>☕</span><span>Rest Break</span></div>
        <div className="flex items-center gap-1.5"><span>😴</span><span>10hr Rest</span></div>
      </div>
    </div>
  );
}
