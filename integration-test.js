// Integration Tests
// This file contains integration tests to ensure app-enhancements.js is properly integrated with script.js

document.addEventListener('DOMContentLoaded', () => {
    // Test if the application is initialized correctly
    console.log('Starting integration tests...');
    
    // Check if the MeetingPointFinder is defined
    if (typeof window.meetingPointFinder === 'undefined') {
        console.error('Integration Test Failed: meetingPointFinder is not defined');
    } else {
        console.log('Integration Test Passed: meetingPointFinder is defined');
        
        // Test dark mode toggle functionality
        if (typeof window.meetingPointFinder.toggleDarkMode === 'function') {
            console.log('Integration Test Passed: toggleDarkMode method is defined');
        } else {
            console.error('Integration Test Failed: toggleDarkMode method is not defined');
        }
        
        // Test location autocomplete functionality
        if (typeof window.meetingPointFinder.initLocationAutocomplete === 'function') {
            console.log('Integration Test Passed: initLocationAutocomplete method is defined');
        } else {
            console.error('Integration Test Failed: initLocationAutocomplete method is not defined');
        }
        
        // Test history panel functionality
        if (typeof window.meetingPointFinder.updateHistoryPanel === 'function') {
            console.log('Integration Test Passed: updateHistoryPanel method is defined');
        } else {
            console.error('Integration Test Failed: updateHistoryPanel method is not defined');
        }
        
        // Test share functionality
        if (typeof window.meetingPointFinder.showShareModal === 'function') {
            console.log('Integration Test Passed: showShareModal method is defined');
        } else {
            console.error('Integration Test Failed: showShareModal method is not defined');
        }
    }
    
    console.log('Integration tests completed.');
});
