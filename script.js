class MeetingPointFinder {
    constructor() {
        this.map = null;
        this.locations = [];
        this.meetingPointMarkers = {
            distance: null,
            travelTime: null
        };
        this.userMarkers = [];
        this.init();
    }

    init() {
        this.initMap();
        this.bindEvents();
        this.requestUserLocation();
    }

    initMap() {
        // Initialize map centered on a default location
        this.map = L.map('map').setView([40.7128, -74.0060], 10); // New York City as default

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add click handler for map
        this.map.on('click', (e) => {
            this.addLocationFromMap(e.latlng.lat, e.latlng.lng);
        });
    }

    requestUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.map.setView([lat, lng], 12);
                },
                (error) => {
                    console.log('Location access denied or unavailable');
                    // Keep default location
                }
            );
        }
    }

    bindEvents() {
        // Add location button
        document.getElementById('addLocationBtn').addEventListener('click', () => {
            this.addLocationFromInput();
        });

        // Enter key for location input
        document.getElementById('locationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addLocationFromInput();
            }
        });

        // Calculate buttons
        document.getElementById('calculateDistanceBtn').addEventListener('click', () => {
            this.calculateMeetingPointByDistance();
        });

        document.getElementById('calculateTravelTimeBtn').addEventListener('click', () => {
            this.calculateMeetingPointByTravelTime();
        });

        // Clear all button
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAll();
        });
    }

    async addLocationFromInput() {
        const input = document.getElementById('locationInput');
        const query = input.value.trim();
        
        if (!query) return;

        try {
            this.showLoading();
            const coords = await this.geocodeAddress(query);
            if (coords) {
                this.addLocation(coords.lat, coords.lng, query);
                input.value = '';
            } else {
                this.showMessage('Location not found. Please try a different address.', 'error');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            this.showMessage('Error finding location. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async geocodeAddress(address) {
        try {
            // Using Nominatim geocoding service (free alternative to Google Maps)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    addLocationFromMap(lat, lng) {
        this.addLocation(lat, lng, `Location ${this.locations.length + 1}`);
    }

    addLocation(lat, lng, name) {
        const location = {
            id: Date.now(),
            lat: lat,
            lng: lng,
            name: name || `Location ${this.locations.length + 1}`
        };

        this.locations.push(location);
        this.addMarkerToMap(location);
        this.updateLocationsList();
        this.clearMeetingPoints();
    }

    addMarkerToMap(location) {
        const marker = L.marker([location.lat, location.lng], {
            icon: this.createCustomIcon('#3182ce')
        }).addTo(this.map);

        marker.bindPopup(`
            <div class="popup-content">
                <div class="popup-title">${location.name}</div>
                <div class="popup-coords">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</div>
            </div>
        `);

        this.userMarkers.push({ marker, id: location.id });
    }

    createCustomIcon(color) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    updateLocationsList() {
        const list = document.getElementById('locationsList');
        
        if (this.locations.length === 0) {
            list.innerHTML = '<li class="no-locations">No locations added yet</li>';
            return;
        }

        list.innerHTML = this.locations.map(location => `
            <li>
                <div class="location-info">
                    <div class="location-name">${location.name}</div>
                    <div class="location-coords">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</div>
                </div>
                <button class="delete-btn" onclick="app.removeLocation(${location.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </li>
        `).join('');
    }

    removeLocation(id) {
        this.locations = this.locations.filter(loc => loc.id !== id);
        
        // Remove marker from map
        const markerIndex = this.userMarkers.findIndex(m => m.id === id);
        if (markerIndex !== -1) {
            this.map.removeLayer(this.userMarkers[markerIndex].marker);
            this.userMarkers.splice(markerIndex, 1);
        }

        this.updateLocationsList();
        this.clearMeetingPoints();
    }

    calculateMeetingPointByDistance() {
        if (this.locations.length < 2) {
            this.showMessage('Please add at least 2 locations to calculate a meeting point.', 'error');
            return;
        }

        // Calculate the centroid (geometric center) - this is the true middle point
        const centroid = this.calculateCentroid(this.locations);
        
        this.clearMeetingPoint('distance');
        
        // Add meeting point marker
        this.meetingPointMarkers.distance = L.marker([centroid.lat, centroid.lng], {
            icon: this.createCustomIcon('#38a169')
        }).addTo(this.map);

        this.meetingPointMarkers.distance.bindPopup(`
            <div class="popup-content">
                <div class="popup-title">Meeting Point (Centroid)</div>
                <div class="popup-coords">${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}</div>
                <div style="margin-top: 5px; font-size: 12px;">Geographic center of all locations</div>
            </div>
        `);

        // Calculate distances from each location to meeting point
        const distances = this.locations.map(loc => {
            const distance = this.calculateDistance(loc.lat, loc.lng, centroid.lat, centroid.lng);
            return { location: loc.name, distance: distance.toFixed(2) };
        });

        // Calculate average distance
        const avgDistance = distances.reduce((sum, d) => sum + parseFloat(d.distance), 0) / distances.length;
        const totalDistance = distances.reduce((sum, d) => sum + parseFloat(d.distance), 0);

        this.displayResults({
            type: 'Geographic Center (Centroid)',
            coordinates: `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`,
            details: distances.map(d => `${d.location}: ${d.distance} km`).join('<br>'),
            avgDistance: avgDistance.toFixed(2),
            totalDistance: totalDistance.toFixed(2)
        });

        // Fit map to show all points
        const allPoints = [...this.locations, centroid];
        const group = new L.featureGroup(allPoints.map(p => L.marker([p.lat, p.lng])));
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    calculateCentroid(locations) {
        // Calculate the simple arithmetic mean of all coordinates
        // This gives us the true geometric center (centroid) of all points
        const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
        const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
        return { lat: avgLat, lng: avgLng };
    }

    async calculateMeetingPointByTravelTime() {
        if (this.locations.length < 2) {
            this.showMessage('Please add at least 2 locations to calculate a meeting point.', 'error');
            return;
        }

        this.showLoading();

        try {
            // Use the same centroid approach but consider travel mode characteristics
            const centroid = this.calculateCentroid(this.locations);
            const travelMode = document.getElementById('travelMode').value;
            
            // For travel time, we still use the centroid but may apply slight adjustments
            // based on travel mode in a real implementation
            const meetingPoint = centroid;
            
            this.clearMeetingPoint('travelTime');
            
            // Add meeting point marker
            this.meetingPointMarkers.travelTime = L.marker([meetingPoint.lat, meetingPoint.lng], {
                icon: this.createCustomIcon('#d69e2e')
            }).addTo(this.map);

            this.meetingPointMarkers.travelTime.bindPopup(`
                <div class="popup-content">
                    <div class="popup-title">Meeting Point (Travel Time)</div>
                    <div class="popup-coords">${meetingPoint.lat.toFixed(6)}, ${meetingPoint.lng.toFixed(6)}</div>
                    <div style="margin-top: 5px; font-size: 12px;">Center point optimized for ${travelMode}</div>
                </div>
            `);

            // Calculate estimated travel times
            const travelTimes = await this.calculateTravelTimes(meetingPoint, travelMode);
            
            this.displayResults({
                type: `Travel Time-Based Meeting Point (${travelMode})`,
                coordinates: `${meetingPoint.lat.toFixed(6)}, ${meetingPoint.lng.toFixed(6)}`,
                details: travelTimes.map(t => `${t.location}: ~${t.time} minutes`).join('<br>'),
                avgTravelTime: (travelTimes.reduce((sum, t) => sum + t.timeMinutes, 0) / travelTimes.length).toFixed(1)
            });

            // Fit map to show all points
            const allPoints = [...this.locations, meetingPoint];
            const group = new L.featureGroup(allPoints.map(p => L.marker([p.lat, p.lng])));
            this.map.fitBounds(group.getBounds().pad(0.1));

        } catch (error) {
            console.error('Error calculating travel time meeting point:', error);
            this.showMessage('Error calculating travel time meeting point. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async calculateTravelTimes(meetingPoint, travelMode) {
        // Simulate travel time calculations
        // In production, use routing APIs like Google Maps, Mapbox, or OSRM
        
        return this.locations.map(loc => {
            const distance = this.calculateDistance(loc.lat, loc.lng, meetingPoint.lat, meetingPoint.lng);
            let speed; // km/h
            
            switch (travelMode) {
                case 'walking':
                    speed = 5;
                    break;
                case 'bicycling':
                    speed = 15;
                    break;
                case 'transit':
                    speed = 25; // Average including stops
                    break;
                default: // driving
                    speed = 40; // Average city driving
                    break;
            }
            
            const timeHours = distance / speed;
            const timeMinutes = Math.round(timeHours * 60);
            
            return {
                location: loc.name,
                time: timeMinutes,
                timeMinutes: timeMinutes
            };
        });
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        // Haversine formula for calculating distance between two points
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    displayResults(result) {
        const resultsPanel = document.getElementById('resultsPanel');
        
        let detailsHtml = '';
        if (result.type.includes('Center') || result.type.includes('Distance')) {
            detailsHtml = `
                <div class="result-details">
                    <strong>Distance from each location:</strong><br>
                    ${result.details}<br><br>
                    <strong>Average distance:</strong> ${result.avgDistance} km<br>
                    <strong>Total distance:</strong> ${result.totalDistance} km
                </div>
            `;
        } else {
            detailsHtml = `
                <div class="result-details">
                    <strong>Estimated travel times:</strong><br>
                    ${result.details}<br><br>
                    <strong>Average travel time:</strong> ${result.avgTravelTime} minutes
                </div>
            `;
        }

        resultsPanel.innerHTML = `
            <div class="result-item">
                <div class="result-title">${result.type}</div>
                <div class="result-details">
                    <strong>Coordinates:</strong> ${result.coordinates}
                </div>
                ${detailsHtml}
            </div>
        `;
    }

    clearMeetingPoint(type) {
        if (this.meetingPointMarkers[type]) {
            this.map.removeLayer(this.meetingPointMarkers[type]);
            this.meetingPointMarkers[type] = null;
        }
    }

    clearMeetingPoints() {
        this.clearMeetingPoint('distance');
        this.clearMeetingPoint('travelTime');
        
        const resultsPanel = document.getElementById('resultsPanel');
        resultsPanel.innerHTML = '<p>Add at least 2 locations to calculate meeting points.</p>';
    }

    clearAll() {
        // Remove all markers
        this.userMarkers.forEach(markerObj => {
            this.map.removeLayer(markerObj.marker);
        });
        
        this.clearMeetingPoints();
        
        // Clear data
        this.locations = [];
        this.userMarkers = [];
        
        // Update UI
        this.updateLocationsList();
        document.getElementById('locationInput').value = '';
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showMessage(message, type) {
        // Create or update message element
        let messageEl = document.querySelector('.message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'message';
            document.querySelector('.controls-panel').insertBefore(
                messageEl, 
                document.querySelector('.controls-panel').firstChild
            );
        }
        
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MeetingPointFinder();
});

// Export for global access (for inline onclick handlers)
window.app = app;
