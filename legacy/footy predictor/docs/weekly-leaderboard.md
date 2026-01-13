# Weekly Leaderboard System

## Overview

The Footy Picker app now includes a comprehensive weekly leaderboard system that allows users to view rankings based on different time periods:

- **Overall Rankings**: Traditional all-time leaderboard based on total accumulated points
- **Current Week**: Rankings based on points earned in the current dashboard week
- **Previous Weeks**: Ability to navigate through past weeks and view historical rankings

## Features

### 1. Week Selection
- **Overall Rankings Button**: Shows traditional all-time leaderboard
- **Current Week Button**: Shows rankings for the current dashboard week
- **Previous Weeks Button**: Enables week navigation for historical data

### 2. Week Navigation
When viewing weekly data, users can:
- Navigate to previous weeks using the "← Previous Week" button
- Navigate to next weeks using the "Next Week →" button
- See the current week display in the center
- View week information in a dedicated column

### 3. Weekly Statistics
For weekly views, the leaderboard shows:
- **Weekly Points**: Points earned in that specific week
- **Correct Predictions**: Number of correct predictions made
- **Total Predictions**: Total number of predictions made
- **Accuracy**: Percentage of correct predictions

## Technical Implementation

### Database Structure
The system leverages the existing Firestore structure:
- `users/{uid}` - User documents with overall points
- `predictions/{fixtureId}/entries/{uid}` - Individual prediction entries
- `weeklySelections/{weekId}` - Admin-curated fixture selections for each week

### Weekly Point Calculation
1. **Fixture Retrieval**: Gets fixtures for the selected week from `weeklySelections`
2. **User Iteration**: Iterates through all users in the system
3. **Prediction Analysis**: For each user, checks predictions for each fixture in the week
4. **Point Aggregation**: Sums up points from correct predictions
5. **Statistics Calculation**: Computes accuracy, correct count, and total predictions

### Week ID Format
Weeks are identified using the format: `YYYY-MM-DD_YYYY-MM-DD`
- Example: `2024-01-19_2024-01-21` represents January 19-21, 2024
- This format allows for easy date parsing and navigation

### API Functions Used
- `getCurrentDashboardWeekId()` - Gets the current active week
- `formatWeekDisplay(weekId)` - Formats week ID for user display
- `getPreviousWeekRange(weekId)` - Calculates previous week range
- `getNextWeekRange(weekId)` - Calculates next week range
- `fetchFixturesForWeek(weekId)` - Retrieves fixtures for a specific week

## User Experience

### Mobile Responsiveness
- Week selector buttons stack vertically on small screens
- Week navigation becomes vertical on mobile devices
- Weekly stats adapt to smaller screen sizes
- Touch-friendly button sizes and spacing

### Visual Design
- Clear button states (active/inactive) for week selection
- Consistent styling with the existing app design
- Color-coded statistics (green for correct, blue for accuracy)
- Smooth transitions and hover effects

### Data Loading
- Loading states for weekly data retrieval
- Error handling for missing or invalid data
- Graceful fallbacks when week data is unavailable

## Usage Instructions

### For Users
1. Navigate to the Leaderboard page
2. Choose between Overall, Current Week, or Previous Weeks
3. Use navigation buttons to explore different weeks
4. View detailed statistics for each player
5. Click on players to see their individual predictions

### For Administrators
1. Set up weekly fixture selections in the Admin panel
2. Ensure fixtures are properly scored and awarded
3. Monitor weekly leaderboard performance
4. Manage week transitions and data consistency

## Benefits

### Competitive Engagement
- Weekly leaderboards create ongoing competition
- Players can track their weekly performance
- Historical data allows for performance analysis
- Seasonal trends become visible

### Data Insights
- Performance patterns across different weeks
- Player consistency and improvement tracking
- Week-over-week comparison capabilities
- Seasonal performance analysis

### User Retention
- Regular updates keep the app engaging
- Weekly goals and achievements
- Social competition and bragging rights
- Long-term progression tracking

## Future Enhancements

### Potential Features
- **Seasonal Leaderboards**: Aggregate performance across multiple weeks
- **Player Streaks**: Track consecutive weeks of good performance
- **Weekly Achievements**: Badges and rewards for weekly accomplishments
- **Export Functionality**: Download weekly performance reports
- **Social Sharing**: Share weekly results on social media

### Technical Improvements
- **Caching**: Cache weekly calculations for better performance
- **Real-time Updates**: Live updates as fixtures are scored
- **Analytics Dashboard**: Detailed performance analytics
- **API Endpoints**: RESTful API for external integrations

## Troubleshooting

### Common Issues
1. **No Weekly Data**: Ensure fixtures are selected for the week in Admin panel
2. **Navigation Errors**: Check if the target week has fixture data
3. **Performance Issues**: Weekly calculations can be resource-intensive for large user bases
4. **Data Inconsistency**: Ensure all predictions are properly scored before viewing weekly data

### Debug Information
- Check browser console for error messages
- Verify Firestore permissions and data structure
- Test with the provided test page (`test-weekly-leaderboard.html`)
- Monitor network requests and database queries

## Conclusion

The weekly leaderboard system transforms the Footy Picker app from a simple prediction game into a comprehensive competitive platform. It provides users with multiple ways to engage with the app while maintaining the simplicity and usability of the original design.

The system is designed to be scalable, maintainable, and user-friendly, with clear separation of concerns and robust error handling. Regular users will find it easy to navigate between different time periods, while administrators have the tools needed to manage and maintain the weekly structure.
