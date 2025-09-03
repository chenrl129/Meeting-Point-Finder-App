class MeetingPointFinder {
    constructor() {
        this.map = null;
        this.locations = [];
        this.meetingPointMarkers = {
            distance: null,
            travelTime: null
        };
        this.userMarkers = [];
        this.routeControl = null;
        this.showRoutesPreference = true; // Default to showing routes
        
        // Dark mode settings - check system preference if no stored preference
        const storedDarkMode = localStorage.getItem('darkMode');
        if (storedDarkMode === null) {
            // Check system preference for dark mode
            const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.darkMode = prefersDarkMode;
            // Save the preference
            localStorage.setItem('darkMode', this.darkMode ? 'enabled' : 'disabled');
        } else {
            this.darkMode = storedDarkMode === 'enabled';
        }
        
        // History of meeting points
        this.meetingPointHistory = JSON.parse(localStorage.getItem('meetingPointHistory') || '[]');
        
        // Current share data
        this.currentShareData = null;
        
        this.init();
    }

    init() {
        // Apply dark mode if enabled
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            // Update icon on theme toggle button
            const themeBtn = document.getElementById('toggleThemeBtn');
            if (themeBtn) {
                const icon = themeBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }
            }
        }
        
        this.initMap();
        this.bindEvents();
        this.requestUserLocation();
        this.showWelcomeModal();
        this.initLocationAutocomplete();
        this.updateHistoryPanel();
        this.setCurrentTime();
    }
    
    setCurrentTime() {
        // Get the current time
        const now = new Date();
        // Format it as HH:MM for the time input
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        // Set the meeting time input to the current time
        const meetingTimeInput = document.getElementById('meetingTime');
        if (meetingTimeInput) {
            meetingTimeInput.value = currentTime;
        }
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
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });
        
        // Theme toggle button
        document.getElementById('toggleThemeBtn').addEventListener('click', () => {
            this.toggleDarkMode();
        });
        
        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.showShareModal();
        });

        // Welcome modal events
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideWelcomeModal();
        });
        document.getElementById('welcomeModal').addEventListener('click', (e) => {
            if (e.target.id === 'welcomeModal') {
                this.hideWelcomeModal();
            }
        });
        document.getElementById('dontShowAgain').addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('hideWelcomeModal', 'true');
            } else {
                localStorage.removeItem('hideWelcomeModal');
            }
        });
        
        // Share modal events
        document.getElementById('closeShareModalBtn').addEventListener('click', () => {
            this.hideShareModal();
        });
        document.getElementById('shareModal').addEventListener('click', (e) => {
            if (e.target.id === 'shareModal') {
                this.hideShareModal();
            }
        });
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyShareLink();
        });
        
        // Share buttons
        document.querySelector('.share-btn.whatsapp').addEventListener('click', () => {
            this.shareVia('whatsapp');
        });
        document.querySelector('.share-btn.email').addEventListener('click', () => {
            this.shareVia('email');
        });
        document.querySelector('.share-btn.sms').addEventListener('click', () => {
            this.shareVia('sms');
        });
        
        // Toggle keyboard shortcuts panel
        document.getElementById('toggleShortcutsBtn').addEventListener('click', () => {
            const shortcutsContent = document.querySelector('.shortcuts-content');
            shortcutsContent.classList.toggle('visible');
        });

        // Map style selectors
        const mapStyleBtns = document.querySelectorAll('.map-style-btn');
        mapStyleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                mapStyleBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Change map style
                const style = btn.getAttribute('data-style');
                this.changeMapStyle(style);
            });
        });
        
        // Show/hide routes checkbox
        document.getElementById('showRoutes').addEventListener('change', (e) => {
            this.toggleRoutes(e.target.checked);
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            // Alt+C: Calculate by distance
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                this.calculateMeetingPointByDistance();
            }
            
            // Alt+T: Calculate by travel time
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                this.calculateMeetingPointByTravelTime();
            }
            
            // Alt+A: Focus add location input
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                document.getElementById('locationInput').focus();
            }
            
            // Alt+X: Clear all
            if (e.altKey && e.key === 'x') {
                e.preventDefault();
                this.clearAll();
            }
        });
    }
    
    changeMapStyle(style) {
        // Remove current tile layer
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });
        
        // Add new tile layer based on selected style
        switch(style) {
            case 'satellite':
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                }).addTo(this.map);
                break;
                
            case 'dark':
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                }).addTo(this.map);
                break;
                
            case 'transport':
                L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38', {
                    attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(this.map);
                break;
                
            default: // default style
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.map);
        }
    }
    
    toggleRoutes(show) {
        // Store the preference
        this.showRoutesPreference = show;
        
        // If we have meeting points, update the routes
        if (this.meetingPointMarkers.distance || this.meetingPointMarkers.travelTime) {
            this.updateRoutes();
        }
    }
    
    updateRoutes() {
        // Clear existing routes
        if (this.routeControl) {
            this.map.removeControl(this.routeControl);
            this.routeControl = null;
        }
        
        // If routes should be hidden, exit here
        if (!this.showRoutesPreference) {
            return;
        }
        
        // Get active meeting point (distance or travel time)
        let meetingPoint = null;
        if (this.meetingPointMarkers.travelTime) {
            meetingPoint = this.meetingPointMarkers.travelTime.getLatLng();
        } else if (this.meetingPointMarkers.distance) {
            meetingPoint = this.meetingPointMarkers.distance.getLatLng();
        } else {
            return; // No meeting point to route to
        }
        
        // Create route waypoints (from each location to meeting point)
        const waypoints = this.locations.map(loc => {
            return [
                L.latLng(loc.lat, loc.lng),
                L.latLng(meetingPoint.lat, meetingPoint.lng)
            ];
        });
        
        // If Leaflet Routing Machine is available, create routes
        if (L.Routing && waypoints.length > 0) {
            // Only create one route at a time for better performance
            const firstWaypoints = waypoints[0];
            this.routeControl = L.Routing.control({
                waypoints: firstWaypoints,
                routeWhileDragging: false,
                lineOptions: {
                    styles: [{color: '#6366F1', opacity: 0.7, weight: 5}]
                },
                createMarker: function() { return null; }, // Don't create markers, we already have them
                show: false // Don't show the routing panel
            }).addTo(this.map);
        }
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
        
        // Update routes if we have an active meeting point
        if ((this.meetingPointMarkers.distance || this.meetingPointMarkers.travelTime) && this.showRoutesPreference) {
            this.updateRoutes();
        }
    }

    addMarkerToMap(location) {
        const marker = L.marker([location.lat, location.lng], {
            icon: this.createCustomIcon('#3182ce', location.name),
            draggable: true // Make markers draggable
        }).addTo(this.map);

        marker.bindPopup(`
            <div class="popup-content">
                <div class="popup-title">${location.name}</div>
                <div class="popup-coords">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</div>
            </div>
        `);

        // Add drag event listener
        marker.on('dragend', (event) => {
            const newLatLng = event.target.getLatLng();
            this.updateLocationPosition(location.id, newLatLng.lat, newLatLng.lng);
        });

        this.userMarkers.push({ marker, id: location.id });
    }

    createCustomIcon(color, label = '') {
        // Check if dark mode is active
        const isDarkMode = document.body.classList.contains('dark-mode');
        const borderColor = isDarkMode ? '#ffffff' : 'white';
        const shadowColor = isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.3)';
        
        // Enhance marker size and visibility
        let html = `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; 
                 border: 4px solid ${borderColor}; box-shadow: 0 0 8px ${shadowColor};"></div>`;
                 
        if (label) {
            // Apply styles directly inline for maximum specificity and override
            if (isDarkMode) {
                html += `<div class="marker-label" style="color: #ffffff !important; 
                background-color: #000000 !important; 
                box-shadow: 0 0 8px rgba(255, 255, 255, 0.7) !important;
                text-shadow: 0 0 3px #ffffff !important;
                border: 2px solid #ffffff !important;
                font-weight: 900 !important;
                font-size: 13px !important;
                padding: 4px 8px !important;
                letter-spacing: 0.5px !important;">${label}</div>`;
            } else {
                html += `<div class="marker-label">${label}</div>`;
            }
        }
        
        return L.divIcon({
            className: 'custom-marker',
            html: html,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
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

    updateLocationPosition(id, lat, lng) {
        const location = this.locations.find(loc => loc.id === id);
        if (location) {
            location.lat = lat;
            location.lng = lng;
            this.updateLocationsList();
            this.clearMeetingPoints();
            this.showMessage('Location updated. Recalculate to see new results.', 'success');
        }
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
            icon: this.createCustomIcon('#38a169', 'Center Point')
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
        
        // Update routes
        if (this.showRoutesPreference) {
            this.updateRoutes();
        }
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
            const meetingTime = document.getElementById('meetingTime').value;
            
            // For travel time, we still use the centroid but may apply slight adjustments
            // based on travel mode in a real implementation
            const meetingPoint = centroid;
            
            this.clearMeetingPoint('travelTime');
            
            // Add meeting point marker
            this.meetingPointMarkers.travelTime = L.marker([meetingPoint.lat, meetingPoint.lng], {
                icon: this.createCustomIcon('#d69e2e', 'Travel Time Point')
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
            
            // Update routes
            if (this.showRoutesPreference) {
                this.updateRoutes();
            }

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
    
    formatMeetingTime(time) {
        if (!time) return 'Not set';
        
        // Convert 24-hour format to 12-hour format with AM/PM
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        
        return `${hour12}:${minutes} ${ampm}`;
    }

    displayResults(result) {
        const resultsPanel = document.getElementById('resultsPanel');
        const meetingTime = document.getElementById('meetingTime').value;
        
        // Format meeting time for display
        const formattedTime = this.formatMeetingTime(meetingTime);
        
        let detailsHtml = '';
        if (result.type.includes('Center') || result.type.includes('Distance')) {
            detailsHtml = `
                <div class="result-details">
                    <p><span class="result-highlight"><i class="far fa-clock"></i> Meeting time:</span> ${formattedTime}</p>
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

    showWelcomeModal() {
        if (!localStorage.getItem('hideWelcomeModal')) {
            document.getElementById('welcomeModal').classList.add('visible');
        }
    }

    hideWelcomeModal() {
        document.getElementById('welcomeModal').classList.remove('visible');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance for access from other scripts and UI event handlers
    window.meetingPointFinder = new MeetingPointFinder();
});
