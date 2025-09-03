// New methods to enhance the Meeting Point Finder app

MeetingPointFinder.prototype.initLocationAutocomplete = function() {
    const input = document.getElementById('locationInput');
    const suggestionsContainer = document.getElementById('locationSuggestions');
    
    if (window.google && window.google.maps && window.google.maps.places) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
            types: ['geocode', 'establishment']
        });
        
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                this.addLocation(lat, lng, place.name || place.formatted_address);
                input.value = '';
            }
        });
    } else {
        console.warn('Google Places API not loaded - using basic input');
        
        // Add basic autocomplete based on previously entered locations
        input.addEventListener('input', () => {
            const value = input.value.trim().toLowerCase();
            if (value.length < 2) {
                suggestionsContainer.classList.remove('visible');
                return;
            }
            
            // Get history items for suggestions
            const suggestions = this.meetingPointHistory.filter(item => 
                item.name.toLowerCase().includes(value)
            ).slice(0, 5);
            
            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = '';
                suggestions.forEach(item => {
                    const suggestionEl = document.createElement('div');
                    suggestionEl.className = 'suggestion-item';
                    suggestionEl.textContent = item.name;
                    suggestionEl.addEventListener('click', () => {
                        input.value = '';
                        this.addLocation(item.lat, item.lng, item.name);
                        suggestionsContainer.classList.remove('visible');
                    });
                    suggestionsContainer.appendChild(suggestionEl);
                });
                suggestionsContainer.classList.add('visible');
            } else {
                suggestionsContainer.classList.remove('visible');
            }
        });
        
        // Hide suggestions on blur
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.remove('visible');
            }
        });
    }
};

// Dark mode toggle
MeetingPointFinder.prototype.toggleDarkMode = function() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    this.darkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', this.darkMode ? 'enabled' : 'disabled');
    
    // Update map style if needed
    if (this.darkMode) {
        this.changeMapStyle('dark');
        document.querySelector('.map-style-btn[data-style="dark"]').classList.add('active');
        document.querySelector('.map-style-btn[data-style="default"]').classList.remove('active');
        document.querySelector('#toggleThemeBtn i').classList.remove('fa-moon');
        document.querySelector('#toggleThemeBtn i').classList.add('fa-sun');
    } else {
        this.changeMapStyle('default');
        document.querySelector('.map-style-btn[data-style="default"]').classList.add('active');
        document.querySelector('.map-style-btn[data-style="dark"]').classList.remove('active');
        document.querySelector('#toggleThemeBtn i').classList.remove('fa-sun');
        document.querySelector('#toggleThemeBtn i').classList.add('fa-moon');
    }
};

// Meeting point history
MeetingPointFinder.prototype.saveMeetingPointToHistory = function(point, type) {
    const historyItem = {
        id: Date.now(),
        lat: point.lat,
        lng: point.lng,
        type: type,
        name: `${type} (${new Date().toLocaleDateString()})`,
        date: new Date().toISOString()
    };
    
    // Add to beginning of array and limit to 10 items
    this.meetingPointHistory.unshift(historyItem);
    if (this.meetingPointHistory.length > 10) {
        this.meetingPointHistory.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('meetingPointHistory', JSON.stringify(this.meetingPointHistory));
    
    // Update history panel
    this.updateHistoryPanel();
};

MeetingPointFinder.prototype.updateHistoryPanel = function() {
    const historyPanel = document.getElementById('historyPanel');
    
    if (this.meetingPointHistory.length === 0) {
        historyPanel.innerHTML = '<p class="no-history">No recent meeting points</p>';
        return;
    }
    
    historyPanel.innerHTML = '';
    this.meetingPointHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-details">
                <div class="history-item-title">${item.name}</div>
                <div class="history-item-date">${new Date(item.date).toLocaleString()}</div>
            </div>
            <div class="history-item-actions">
                <button class="history-btn load-btn" title="Load this meeting point">
                    <i class="fas fa-map-pin"></i>
                </button>
                <button class="history-btn share-btn" title="Share this meeting point">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        const loadBtn = historyItem.querySelector('.load-btn');
        loadBtn.addEventListener('click', () => {
            this.loadHistoryItem(item);
        });
        
        const shareBtn = historyItem.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => {
            this.prepareShare(item);
        });
        
        historyPanel.appendChild(historyItem);
    });
};

MeetingPointFinder.prototype.loadHistoryItem = function(item) {
    // Center map on the historical meeting point
    this.map.setView([item.lat, item.lng], 14);
    
    // Create a temporary marker
    if (this.tempHistoryMarker) {
        this.map.removeLayer(this.tempHistoryMarker);
    }
    
    this.tempHistoryMarker = L.marker([item.lat, item.lng], {
        icon: this.createCustomIcon('#f59e0b')
    }).addTo(this.map);
    
    this.tempHistoryMarker.bindPopup(`
        <div class="popup-content">
            <div class="popup-title">Historical Meeting Point</div>
            <div class="popup-coords">${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}</div>
            <div style="margin-top: 5px; font-size: 12px;">${item.name}<br>Created: ${new Date(item.date).toLocaleString()}</div>
        </div>
    `).openPopup();
};

// Export functionality
MeetingPointFinder.prototype.exportData = function() {
    if (this.locations.length === 0) {
        this.showMessage('No locations to export', 'error');
        return;
    }
    
    // Create export data
    const exportData = {
        locations: this.locations,
        meetingPoints: {
            distance: this.meetingPointMarkers.distance ? {
                lat: this.meetingPointMarkers.distance.getLatLng().lat,
                lng: this.meetingPointMarkers.distance.getLatLng().lng
            } : null,
            travelTime: this.meetingPointMarkers.travelTime ? {
                lat: this.meetingPointMarkers.travelTime.getLatLng().lat,
                lng: this.meetingPointMarkers.travelTime.getLatLng().lng
            } : null
        },
        exportDate: new Date().toISOString()
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-points-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showMessage('Data exported successfully', 'success');
};

// Share functionality
MeetingPointFinder.prototype.prepareShare = function(point) {
    // If point is not provided, use current meeting point
    if (!point) {
        if (this.meetingPointMarkers.distance) {
            point = {
                lat: this.meetingPointMarkers.distance.getLatLng().lat,
                lng: this.meetingPointMarkers.distance.getLatLng().lng,
                type: 'Center Point'
            };
        } else if (this.meetingPointMarkers.travelTime) {
            point = {
                lat: this.meetingPointMarkers.travelTime.getLatLng().lat,
                lng: this.meetingPointMarkers.travelTime.getLatLng().lng,
                type: 'Travel Time Point'
            };
        } else {
            this.showMessage('No meeting point to share', 'error');
            return;
        }
    }
    
    this.currentShareData = point;
    this.showShareModal();
};

MeetingPointFinder.prototype.showShareModal = function() {
    if (!this.currentShareData && (this.meetingPointMarkers.distance || this.meetingPointMarkers.travelTime)) {
        this.prepareShare();
    }
    
    if (!this.currentShareData) {
        this.showMessage('Calculate a meeting point first', 'error');
        return;
    }
    
    const shareLink = document.getElementById('shareLink');
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${this.currentShareData.lat},${this.currentShareData.lng}`;
    shareLink.value = mapLink;
    
    // Generate QR code if the library is loaded
    if (window.QRCode) {
        const qrContainer = document.getElementById('qrCode');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: mapLink,
            width: 200,
            height: 200
        });
    }
    
    document.getElementById('shareModal').style.display = 'flex';
};

MeetingPointFinder.prototype.hideShareModal = function() {
    document.getElementById('shareModal').style.display = 'none';
};

MeetingPointFinder.prototype.copyShareLink = function() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    this.showMessage('Link copied to clipboard!', 'success');
};

MeetingPointFinder.prototype.shareVia = function(method) {
    if (!this.currentShareData) return;
    
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${this.currentShareData.lat},${this.currentShareData.lng}`;
    const text = `Check out this meeting point I found: ${mapLink}`;
    
    switch(method) {
        case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
            break;
        case 'email':
            window.open(`mailto:?subject=Meeting Point&body=${encodeURIComponent(text)}`);
            break;
        case 'sms':
            window.open(`sms:?body=${encodeURIComponent(text)}`);
            break;
    }
};
