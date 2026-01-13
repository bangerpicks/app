# API Football Widgets Documentation

## Overview

API Football widgets provide an easy way to display football data on your website without requiring complex API integration. These widgets are completely free and work with all plans including the free tier.

## Key Features

- **Free to Use**: No additional cost beyond your API plan
- **Easy Integration**: Simple copy-paste implementation
- **Real-time Updates**: Automatic data refresh capabilities
- **Multiple Themes**: Default, grey, and dark themes available
- **Responsive Design**: Works on all device sizes
- **Single Script**: One script tag per page for all widgets

## Integration Requirements

### Required Script Tag
```html
<script
    type="module"
    src="https://widgets.api-sports.io/2.0.3/widgets.js">
</script>
```

### Common Parameters
All widgets require these base parameters:
- `data-host`: API endpoint (direct subscription or RapidAPI)
- `data-key`: Your API key
- `data-theme`: Theme selection (optional)
- `data-show-errors`: Error display toggle (optional)

---

## Games Widget

### Overview
The Games widget displays a list of matches grouped by competition. It automatically updates according to the selected refresh frequency and can be filtered by date, league, and season.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data-host` | string | ✅ | API endpoint: `v3.football.api-sports.io` or `api-football-v1.p.rapidapi.com` |
| `data-key` | string | ✅ | Your API key from dashboard or RapidAPI |
| `data-refresh` | integer | ❌ | Data update frequency in seconds (minimum 15, 0 = no auto-update) |
| `data-date` | string | ❌ | Date in YYYY-MM-DD format (defaults to current date) |
| `data-league` | integer | ❌ | League ID from dashboard |
| `data-season` | integer | ❌ | Season in YYYY format |
| `data-theme` | string | ❌ | Theme: `grey`, `dark`, or empty for default |
| `data-show-toolbar` | string | ❌ | Show toolbar for view switching: `true`/`false` |
| `data-show-logos` | string | ❌ | Display team logos: `true`/`false` |
| `data-modal-game` | string | ❌ | Enable game details modal: `true`/`false` |
| `data-modal-standings` | string | ❌ | Enable standings modal: `true`/`false` |
| `data-modal-show-logos` | string | ❌ | Show logos/images in modals: `true`/`false` |
| `data-show-errors` | string | ❌ | Display error messages: `true`/`false` |

### Implementation Example

```html
<div id="wg-api-football-games"
     data-host="v3.football.api-sports.io"
     data-key="Your-Api-Key-Here"
     data-date=""
     data-league=""
     data-season=""
     data-theme=""
     data-refresh="15"
     data-show-toolbar="true"
     data-show-errors="false"
     data-show-logos="true"
     data-modal-game="true"
     data-modal-standings="true"
     data-modal-show-logos="true">
</div>

<script
    type="module"
    src="https://widgets.api-sports.io/2.0.3/widgets.js">
</script>
```

### Use Cases
- **Live Scores**: Display current day's matches with auto-refresh
- **League Overview**: Show all matches for a specific league and season
- **Date Selection**: Allow users to browse matches by specific dates
- **Competition Comparison**: Display multiple leagues simultaneously

---

## Game Widget

### Overview
The Game widget displays a specific fixture with detailed information including events, statistics, lineups, and player statistics when available. It's ideal for showing comprehensive match details.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data-host` | string | ✅ | API endpoint: `v3.football.api-sports.io` or `api-football-v1.p.rapidapi.com` |
| `data-key` | string | ✅ | Your API key from dashboard or RapidAPI |
| `data-refresh` | integer | ❌ | Data update frequency in seconds (minimum 15, 0 = no auto-update) |
| `data-id` | integer | ❌ | Fixture ID to display |
| `data-theme` | string | ❌ | Theme: `grey`, `dark`, or empty for default |
| `data-show-errors` | string | ❌ | Display error messages: `true`/`false` |
| `data-show-logos` | string | ❌ | Display team logos and player images: `true`/`false` |

### Implementation Example

```html
<div id="wg-api-football-game"
    data-host="v3.football.api-sports.io"
    data-key="Your-Api-Key-Here"
    data-id="718243"
    data-theme=""
    data-refresh="15"
    data-show-errors="false"
    data-show-logos="true">
</div>

<script
    type="module"
    src="https://widgets.api-sports.io/2.0.3/widgets.js">
</script>
```

### Use Cases
- **Match Details**: Display comprehensive fixture information
- **Live Match Tracking**: Real-time updates during live matches
- **Post-Match Analysis**: Show detailed statistics and events
- **Player Performance**: Individual player statistics and lineups

---

## Standings Widget

### Overview
The Standings widget displays the ranking of a competition or team performance. It's perfect for showing league tables, team rankings, and competition standings.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data-host` | string | ✅ | API endpoint: `v3.football.api-sports.io` or `api-football-v1.p.rapidapi.com` |
| `data-key` | string | ✅ | Your API key from dashboard or RapidAPI |
| `data-league` | integer | ❌ | League ID from dashboard |
| `data-team` | integer | ❌ | Team ID from dashboard |
| `data-season` | integer | ✅ | Season in YYYY format |
| `data-theme` | string | ❌ | Theme: `grey`, `dark`, or empty for default |
| `data-show-errors` | string | ❌ | Display error messages: `true`/`false` |
| `data-show-logos` | string | ❌ | Display team logos: `true`/`false` |

### Implementation Example

```html
<div id="wg-api-football-standings"
    data-host="v3.football.api-sports.io"
    data-key="Your-Api-Key-Here"
    data-league="39"
    data-season="2023"
    data-theme=""
    data-show-errors="false"
    data-show-logos="true">
</div>

<script
    type="module"
    src="https://widgets.api-sports.io/2.0.3/widgets.js">
</script>
```

### Use Cases
- **League Tables**: Display current standings for competitions
- **Team Rankings**: Show team performance across seasons
- **Competition Overview**: Multiple league standings on one page
- **Season Comparisons**: Historical standings data

---

## Advanced Configuration

### Multiple Widgets on Same Page

```html
<!-- Games Widget -->
<div id="wg-api-football-games"
     data-host="v3.football.api-sports.io"
     data-key="Your-Api-Key-Here"
     data-league="39"
     data-season="2023"
     data-theme="dark">
</div>

<!-- Standings Widget -->
<div id="wg-api-football-standings"
     data-host="v3.football.api-sports.io"
     data-key="Your-Api-Key-Here"
     data-league="39"
     data-season="2023"
     data-theme="dark">
</div>

<!-- Single Script Tag -->
<script
    type="module"
    src="https://widgets.api-sports.io/2.0.3/widgets.js">
</script>
```

### Dynamic Parameter Changes

```javascript
// Change widget parameters dynamically
function updateWidget(leagueId, season) {
    const gamesWidget = document.getElementById('wg-api-football-games');
    gamesWidget.setAttribute('data-league', leagueId);
    gamesWidget.setAttribute('data-season', season);
    
    // Reload widget with new parameters
    if (window.apiFootballWidgets) {
        window.apiFootballWidgets.reload('wg-api-football-games');
    }
}

// Example usage
updateWidget(39, 2023);
```

### Custom Styling

```css
/* Custom widget styling */
#wg-api-football-games {
    border: 2px solid #007bff;
    border-radius: 8px;
    margin: 20px 0;
}

/* Hide specific elements */
#wg-api-football-games .widget-toolbar {
    display: none;
}

/* Custom theme overrides */
#wg-api-football-games[data-theme="custom"] {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}
```

---

## Security and Best Practices

### API Key Protection

⚠️ **Important Security Notice**: API keys are visible in the HTML source code.

**Protection Methods:**
1. **Domain Restrictions**: Set allowed domains in your dashboard
2. **Key Rotation**: Regularly rotate your API keys
3. **Monitoring**: Track API usage for unauthorized access

### Implementation Best Practices

1. **Single Script Loading**: Load the widget script only once per page
2. **Parameter Validation**: Ensure all required parameters are set
3. **Error Handling**: Use `data-show-errors="true"` during development
4. **Performance**: Set appropriate refresh rates to avoid excessive API calls
5. **Responsive Design**: Test widgets on various screen sizes

### Error Troubleshooting

Common issues and solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| Widget not displaying | Invalid API key | Verify API key and domain restrictions |
| No data shown | Invalid league/team ID | Check IDs in dashboard |
| Rate limit errors | Daily quota exceeded | Monitor API usage |
| Script errors | Missing script tag | Ensure script is loaded |
| Styling issues | Theme conflicts | Check CSS conflicts |

---

## Performance Optimization

### Refresh Rate Guidelines

- **Live Matches**: 15-30 seconds
- **Recent Results**: 60-300 seconds
- **Standings**: 300-900 seconds
- **Historical Data**: No auto-refresh needed

### Caching Strategies

1. **Browser Caching**: Leverage browser cache for static assets
2. **CDN Integration**: Use BunnyCDN for optimal delivery
3. **Local Storage**: Cache widget data locally when possible
4. **Lazy Loading**: Load widgets only when needed

---

## Support and Resources

### Documentation
- [API Football Official Docs](https://www.api-football.com/)
- [Widget Examples](https://widgets.api-sports.io/)
- [Dashboard](https://dashboard.api-football.com/)

### Tutorials
- [Custom Widget Styling](https://blog.api-football.com/)
- [Dynamic Parameter Changes](https://blog.api-football.com/)
- [Multiple Widgets Integration](https://blog.api-football.com/)

### Community Support
- [Developer Forums](https://community.api-football.com/)
- [GitHub Examples](https://github.com/api-football)
- [Discord Community](https://discord.gg/api-football)

---

## Version History

### Widget Version 2.0.3
- Merged Livescore and Fixtures into Games widget
- Added date and status selectors
- Integrated standings modal
- Logo/image toggle options
- Multi-sport support

### Widget Version 1.1.8
- Individual Fixture widget
- Modal integration for detailed views

### Widget Version 1.0.0
- Initial release with Livescore, Fixtures, and Standings widgets

---

*Last Updated: [Current Date]*
*Widget Version: 2.0.3*
*Documentation Version: 1.0*
