import { MapView } from "@/components/Map";
import { useEffect, useRef, useState } from "react";

type Location = { latitude: number; longitude: number };
type Props = { destination: Location | null; riderLocation: Location | null; className?: string };

function toLatLng(location: Location) { return { lat: location.latitude, lng: location.longitude }; }

export function DeliveryTrackingMap({ destination, riderLocation, className }: Props) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const directions = useRef<google.maps.DirectionsRenderer | null>(null);
  const center = riderLocation || destination;

  useEffect(() => {
    if (!map || !window.google || !center) return;
    markers.current.forEach(marker => { marker.map = null; });
    markers.current = [];
    directions.current?.setMap(null);
    const bounds = new google.maps.LatLngBounds();
    if (destination) {
      const point = toLatLng(destination);
      bounds.extend(point);
      markers.current.push(new google.maps.marker.AdvancedMarkerElement({ map, position: point, title: "Delivery destination" }));
    }
    if (riderLocation) {
      const point = toLatLng(riderLocation);
      bounds.extend(point);
      markers.current.push(new google.maps.marker.AdvancedMarkerElement({ map, position: point, title: "Rider location" }));
    }
    if (destination && riderLocation) {
      const renderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: true, preserveViewport: true });
      directions.current = renderer;
      void new google.maps.DirectionsService().route({ origin: toLatLng(riderLocation), destination: toLatLng(destination), travelMode: google.maps.TravelMode.DRIVING }).then(result => renderer.setDirections(result)).catch(() => undefined);
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
    return () => { markers.current.forEach(marker => { marker.map = null; }); directions.current?.setMap(null); };
  }, [map, destination?.latitude, destination?.longitude, riderLocation?.latitude, riderLocation?.longitude]);

  if (!center) return <div className="rounded-2xl bg-[#fbf8f2] p-4 text-sm text-[#74695b]">A map will appear when the delivery address is pinned with customer consent.</div>;
  return <MapView initialCenter={toLatLng(center)} initialZoom={14} onMapReady={setMap} className={className ?? "h-[320px] overflow-hidden rounded-2xl"} />;
}
