// src/components/ClientMap.jsx
import React from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

// Este componente interno se encarga de geocodificar y renderizar un marcador.
// Desafortunadamente, los hooks no se pueden usar en un bucle, por lo que necesitamos un subcomponente.
// NOTA: La geocodificación se ha simplificado aquí. Una implementación más robusta
// manejaría los límites de la API y el almacenamiento en caché de resultados.
const GeocodedMarker = ({ address }) => {
    const [position, setPosition] = React.useState(null);

    React.useEffect(() => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                setPosition(results[0].geometry.location);
            } else {
                console.error(`Geocode was not successful for the following reason: ${status}`);
            }
        });
    }, [address]);

    if (!position) return null;
    return <AdvancedMarker position={position} />;
};

const ClientMap = ({ clients }) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return <div className="text-red-500">La clave de API de Google Maps no está configurada.</div>;
    }

    // Centro del mapa en Honduras
    const defaultCenter = { lat: 14.7934, lng: -86.8509 };

    return (
        <APIProvider apiKey={apiKey}>
            <div style={{ height: '400px', width: '100%' }}>
                <Map
                    defaultCenter={defaultCenter}
                    defaultZoom={7}
                    mapId="marnystock-map" // Un ID para el estilo del mapa
                >
                    {clients.map((client, index) => (
                       client.address && <GeocodedMarker key={index} address={`${client.address}, Honduras`} />
                    ))}
                </Map>
            </div>
        </APIProvider>
    );
};

export default ClientMap;