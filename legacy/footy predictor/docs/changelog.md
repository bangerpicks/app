# API Football Changelog

## Overview

This document tracks all changes, updates, and new features introduced to the API Football service. Each version includes detailed information about new endpoints, parameter additions, and feature enhancements.

---

## Version 3.9.3

**Release Date**: Latest Release

### New Endpoints

#### Players
- **`players/profiles`** - Returns the complete list of all available players
- **`players/teams`** - Returns the list of teams and seasons in which a player played during their career

### Enhanced Endpoints

#### Fixtures
- **`fixtures`** - Added new fields:
  - `extra` - Returns additional time played in a half
  - `standings` - Boolean indicating whether the fixture's competition covers standings (True | False)

#### Fixtures/Rounds
- **`fixtures/rounds`** - Added `dates` parameter to retrieve the dates of each round in the response

#### Fixtures/Statistics
- **`fixtures/statistics`** - Added `half` parameter to retrieve halftime statistics in the response

#### Injuries
- **`injuries`** - Added `ids` parameter to retrieve data from several fixtures in one API call

#### Teams/Statistics
- **`teams/statistics`** - Added new statistics:
  - Goals Over
  - Goals Under

#### Sidelined
- **`sidelined`** - Added new parameters:
  - `players` - Retrieve data from several players in one call
  - `coachs` - Retrieve data from several coaches in one call

#### Trophies
- **`trophies`** - Added new parameters:
  - `players` - Retrieve data from several players in one call
  - `coachs` - Retrieve data from several coaches in one call

---

## Version 3.9.2

### New Endpoints

#### Odds
- **`odds/live`** - New endpoint for live odds
- **`odds/live/bets`** - New endpoint for live betting odds

#### Teams
- **`teams/countries`** - New endpoint for team countries

### Enhanced Endpoints

#### Teams
- **`teams`** - Added new parameters:
  - `code` - Team code parameter
  - `venue` - Venue parameter

#### Fixtures
- **`fixtures`** - Enhanced functionality:
  - Added `ids` parameter to retrieve data from several fixtures including events, lineups, statistics and players in one API call
  - Added possibility to specify multiple statuses for the `status` parameter
  - Added `venue` parameter

#### Fixtures/Head-to-Head
- **`fixtures/headtohead`** - Enhanced functionality:
  - Added possibility to specify multiple statuses for the `status` parameter
  - Added `venue` parameter

---

## Version 3.8.1

### New Endpoints

#### Players
- **`players/squads`** - Player squad information
- **`players/topassists`** - Top assists leaders
- **`players/topyellowcards`** - Top yellow card recipients
- **`players/topredcards`** - Top red card recipients

#### Injuries
- **`injuries`** - New endpoint for injury data

### Enhanced Endpoints

#### Fixtures/Lineups
- **`fixtures/lineups`** - Added new features:
  - Players positions on the grid
  - Players' jerseys colors

#### Fixtures/Events
- **`fixtures/events`** - Added VAR events support

#### Teams
- **`teams`** - Added tri-code support

#### Teams/Statistics
- **`teams/statistics`** - Added new statistics:
  - Scoring minute
  - Cards per minute
  - Most played formation
  - Penalty statistics
  - Coaches photos

---

## CDN Integration

### BunnyCDN Optimization

BunnyCDN is a Content Delivery Network that provides global content distribution with strategically positioned servers for optimal performance.

#### Key Features
- **Quick Configuration**: Set up media CDN in just 5 minutes
- **Global Accessibility**: Worldwide server network for swift content delivery
- **Customized Configuration**: Tailor caching, define cache times, implement CORS headers
- **Domain Ownership**: Personalize media delivery with your own domain
- **Robust Security**: Advanced security features for secure content delivery
- **Responsive Performance**: Optimized media delivery without prior downloads

#### Tutorial
A comprehensive tutorial is available on the blog to help configure BunnyCDN integration.

---

## Database Solutions

### Aiven Integration

Aiven offers managed database services with high performance, flexibility, and security.

#### Available Services
- **Relational Databases**: PostgreSQL, MySQL
- **NoSQL Databases**: Cassandra, Redis
- **Streaming Systems**: Kafka
- **Cloud Providers**: Google Cloud, AWS, Azure, DigitalOcean

#### Features
- **Free Tier**: Available for getting started
- **Testing Credits**: Explore platform capabilities
- **99.99% SLA**: High availability commitment
- **Simplified Management**: Easy database administration

#### Resources
- [Service Testing Page](https://aiven.io/)
- [Developer Center](https://aiven.io/dev)
- [Documentation](https://docs.aiven.io/)

### Firebase Realtime Database

Firebase provides cloud-based real-time database synchronization across users and devices.

#### Key Benefits
- **Real-Time Data**: Instant updates across all connected users
- **Easy Synchronization**: Automatic data sync across devices
- **Built-In Security**: Flexible security rules for data access control
- **Simplified Integration**: Easy integration with other Firebase services

#### Resources
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Documentation](https://firebase.google.com/docs/database)
- [Blog Tutorial](https://blog.api-football.com/)

---

## Widgets

### Overview

API Football widgets are completely free and work with all plans including the free tier. They provide easy integration for displaying football data on your website.

### Integration Requirements

#### Required Tags
```html
data-host: v3.football.api-sports.io (direct subscription) or api-football-v1.p.rapidapi.com (RapidAPI)
data-key: Your API key from dashboard or RapidAPI
data-theme: grey, dark, or false (default theme if empty)
data-show-errors: true/false (default: false, for debugging)
```

#### Features
- **Single Script Integration**: One script tag per page
- **Unified Theme**: Single theme applied to all widgets on the same page
- **Request Tracking**: All widget requests count towards your daily limit
- **Domain Protection**: Restrict API key usage to specific domains

### Security Considerations

⚠️ **Important**: API keys are visible to website users. Protect your key by:
- Setting domain restrictions in your dashboard
- Resetting your API key if domain protection wasn't initially enabled

### Debugging

Enable debugging by setting `data-show-errors="true"` to display error messages in the widget and console.

#### Common Issues
- Daily request limit reached
- Incorrectly filled tags
- Invalid API key

### Available Widgets

#### Version 2.0.3
- **Games Widget**: Merged Livescore and Fixtures functionality
- **Date Selector**: Choose specific dates for games
- **Status Selector**: Filter games by status
- **Standings Modal**: Display standings within games widget
- **Logo/Image Toggle**: Option to show/hide logos and images
- **Multi-Sport Support**: Baseball, Basketball, Handball, Hockey, Rugby, Volleyball

#### Version 1.1.8
- **Fixture Widget**: Individual fixture display
- **Modal Integration**: Detailed fixture information in Livescore and Fixtures widgets

#### Version 1.0.0
- **Livescore Widget**: Real-time score updates
- **Fixtures Widget**: Upcoming and past matches
- **Standings Widget**: League table display

### Tutorials

- [Custom API-Football Widgets](https://blog.api-football.com/)
- [Dynamic Widget Attribute Changes](https://blog.api-football.com/)
- [Multiple Widgets on Same Page](https://blog.api-football.com/)

### Source Files

Download widget source files for customization:
- [Version 2.0.3 Files](https://api-football.com/widgets/2.0.3)
- [Version 1.1.8 Files](https://api-football.com/widgets/1.1.8)

---

## Migration Guide

### Updating from 3.8.x to 3.9.x

1. **New Player Endpoints**: Implement `players/profiles` and `players/teams` for enhanced player data
2. **Enhanced Fixtures**: Update your fixtures handling to include new `extra` and `standings` fields
3. **Statistics Improvements**: Leverage new halftime statistics and enhanced team statistics
4. **Batch Operations**: Use new `ids` parameters for efficient multiple data retrieval

### Updating from 3.7.x to 3.8.x

1. **Player Statistics**: Implement new player ranking endpoints
2. **Enhanced Lineups**: Update lineup displays to show player positions and jersey colors
3. **VAR Events**: Handle new VAR event types in your event processing
4. **Team Enhancements**: Support new tri-code and enhanced statistics

---

## Support and Resources

### Documentation
- [API Football Official Docs](https://www.api-football.com/)
- [Widget Documentation](https://api-football.com/widgets)
- [Blog Tutorials](https://blog.api-football.com/)

### Community
- [Developer Forums](https://community.api-football.com/)
- [GitHub Examples](https://github.com/api-football)
- [Discord Community](https://discord.gg/api-football)

---

*Last Updated: [Current Date]*
*Current Version: 3.9.3*
*Documentation Version: 1.0*
