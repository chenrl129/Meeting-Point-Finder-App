# Meeting Point Finder App

A web application that helps you find the optimal meeting location based on the locations of multiple people. The app calculates meeting points using two different methods:

1. **Distance-based calculation**: Finds the geometric median that minimizes the total travel distance
2. **Travel time-based calculation**: Estimates the optimal point that minimizes total travel time based on different transportation modes

## Features

- 🗺️ **Interactive Map**: Click on the map or search for addresses to add locations
- 📍 **Multiple Location Support**: Add as many friend locations as needed
- 🧮 **Smart Calculations**: 
  - Geometric median calculation for distance optimization
  - Travel time estimation with different transport modes
- 🚗 **Multiple Transport Modes**: Driving, walking, public transit, and bicycling
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎯 **Visual Results**: Clear markers and detailed distance/time breakdowns

## How It Works

### Distance-Based Calculation
Uses the Weiszfeld algorithm to find the geometric median point that minimizes the sum of distances from all input locations. This is mathematically optimal for minimizing total travel distance.

### Travel Time-Based Calculation
Estimates travel times based on:
- **Driving**: ~40 km/h average city speed
- **Walking**: ~5 km/h
- **Bicycling**: ~15 km/h  
- **Public Transit**: ~25 km/h (including stops and transfers)

*Note: In a production environment, this would integrate with routing APIs like Google Maps, Mapbox, or OpenStreetMap Routing Machine (OSRM) for accurate real-time travel time calculations.*

## Usage

1. **Add Locations**: 
   - Click anywhere on the map to add a location
   - Or type an address in the search box and click "Add"

2. **Calculate Meeting Points**:
   - Click "Calculate by Distance" for the optimal distance-based meeting point
   - Click "Calculate by Travel Time" for travel time optimization
   - Select your preferred transportation mode before calculating travel time

3. **View Results**:
   - See detailed breakdowns of distances or travel times
   - Meeting points are marked with different colored pins
   - Zoom and pan to explore the suggested locations

4. **Manage Locations**:
   - Remove individual locations using the trash icon
   - Clear all locations with the "Clear All" button

## Technologies Used

- **HTML5 & CSS3**: Modern responsive web design
- **JavaScript (ES6+)**: Core application logic
- **Leaflet.js**: Interactive mapping library
- **OpenStreetMap**: Free map tiles and geocoding service
- **Nominatim**: Geocoding service for address lookup

## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Allow location access for better initial map positioning (optional)
4. Start adding locations and finding meeting points!

## Map Legend

- 🔵 **Blue Markers**: User-added locations
- 🟢 **Green Marker**: Distance-based meeting point
- 🟡 **Yellow Marker**: Travel time-based meeting point

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Future Enhancements

- Integration with real routing APIs (Google Maps, Mapbox)
- Traffic-aware travel time calculations
- Public transit schedule integration
- Save/load location sets
- Export meeting points to calendar/maps apps
- Accessibility improvements
- Offline functionality

## Contributing

Feel free to fork this project and submit pull requests for improvements!

## License

MIT License - feel free to use this code for personal or commercial projects.