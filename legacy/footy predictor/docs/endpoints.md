# API Football Endpoints Documentation

## Overview

This document provides comprehensive documentation for all API Football endpoints, including parameters, use cases, code examples, and implementation details.

---

## Countries Endpoint

### Basic Information

- **Endpoint**: `GET /countries`
- **Purpose**: Get the list of available countries for the leagues endpoint
- **Update Frequency**: Updated when new leagues from uncovered countries are added
- **Recommended Calls**: 1 call per day

### Endpoint Details

The name and code fields from this endpoint can be used in other endpoints as filters. Country flags are available at: `https://media.api-sports.io/flags/{country_code}.svg`

### Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `name` | string | ❌ | The name of the country | None |
| `code` | string | ❌ | The Alpha code of the country | 2-6 characters (e.g., FR, GB-ENG, IT) |
| `search` | string | ❌ | The name of the country | Minimum 3 characters |

**Note**: All parameters can be used together for advanced filtering.

### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `x-rapidapi-key` | string | ✅ | Your API key |
| `x-rapidapi-host` | string | ✅ | API host: `v3.football.api-sports.io` |

### Response Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `204` | No Content - No countries found |
| `499` | Time Out - Request timed out |
| `500` | Internal Server Error - Server error |

---

## Teams Endpoints

### Main Teams Endpoint

#### Basic Information

- **Endpoint**: `GET /teams`
- **Purpose**: Get the list of available teams
- **Update Frequency**: Updated several times a week
- **Recommended Calls**: 1 call per day
- **Requirement**: At least one parameter is required

#### Endpoint Details

Team IDs are unique in the API and teams keep them across all leagues/cups. Team logos are available at: `https://media.api-sports.io/football/teams/{team_id}.png`

#### Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `id` | integer | ❌ | The ID of the team | None |
| `name` | string | ❌ | The name of the team | None |
| `league` | integer | ❌ | The ID of the league | None |
| `season` | integer | ❌ | The season of the league | 4 characters (YYYY) |
| `country` | string | ❌ | The country name of the team | None |
| `code` | string | ❌ | The code of the team | 3 characters |
| `venue` | integer | ❌ | The ID of the venue | None |
| `search` | string | ❌ | The name or country name of the team | Minimum 3 characters |

**Note**: All parameters can be used together for advanced filtering. At least one parameter is required.

#### Use Cases

1. **Get Team by ID**: `https://v3.football.api-sports.io/teams?id=33`
2. **Get Team by Name**: `https://v3.football.api-sports.io/teams?name=manchester united`
3. **Get Teams by League & Season**: `https://v3.football.api-sports.io/teams?league=39&season=2019`
4. **Get Teams by Country**: `https://v3.football.api-sports.io/teams?country=england`
5. **Get Teams by Code**: `https://v3.football.api-sports.io/teams?code=FRA`
6. **Get Teams by Venue**: `https://v3.football.api-sports.io/teams?venue=789`
7. **Search Teams**: `https://v3.football.api-sports.io/teams?search=manches`

### Teams Statistics Endpoint

#### Basic Information

- **Endpoint**: `GET /teams/statistics`
- **Purpose**: Returns the statistics of a team in relation to a given competition and season
- **Update Frequency**: Updated twice a day
- **Recommended Calls**: 1 call per day for teams with fixtures, otherwise 1 call per week

#### Endpoint Details

It's possible to add the date parameter to calculate statistics from the beginning of the season to the given date. By default, the API returns statistics of all games played by the team for the competition and season.

#### Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `league` | integer | ✅ | The ID of the league | None |
| `season` | integer | ✅ | The season of the league | 4 characters (YYYY) |
| `team` | integer | ✅ | The ID of the team | None |
| `date` | string | ❌ | The limit date | YYYY-MM-DD format |

#### Use Cases

1. **Get Team Statistics**: `https://v3.football.api-sports.io/teams/statistics?league=39&team=33&season=2019`
2. **Get Team Statistics with Date Limit**: `https://v3.football.api-sports.io/teams/statistics?league=39&team=33&season=2019&date=2019-10-08`

### Teams Seasons Endpoint

#### Basic Information

- **Endpoint**: `GET /teams/seasons`
- **Purpose**: Get the list of seasons available for a team
- **Update Frequency**: Updated several times a week
- **Recommended Calls**: 1 call per day
- **Requirement**: At least one parameter is required

#### Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `team` | integer | ✅ | The ID of the team | None |

#### Use Cases

1. **Get Team Seasons**: `https://v3.football.api-sports.io/teams/seasons?team=33`

### Teams Countries Endpoint

#### Basic Information

- **Endpoint**: `GET /teams/countries`
- **Purpose**: Get the list of countries available for the teams endpoint
- **Update Frequency**: Updated several times a week
- **Recommended Calls**: 1 call per day

#### Parameters

No query parameters required.

#### Use Cases

1. **Get All Team Countries**: `https://v3.football.api-sports.io/teams/countries`

---

## Teams Code Examples

### PHP

#### Get Team by ID
```php
<?php
$teamId = 33;
$url = 'https://v3.football.api-sports.io/teams?id=' . $teamId;

$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => array(
    'x-rapidapi-key: YOUR_API_KEY_HERE',
    'x-rapidapi-host: v3.football.api-sports.io'
  ),
));

$response = curl_exec($curl);
curl_close($curl);

$team = json_decode($response, true);
?>
```

#### Get Teams by League and Season
```php
<?php
$leagueId = 39;
$season = 2019;
$url = "https://v3.football.api-sports.io/teams?league={$leagueId}&season={$season}";

$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => array(
    'x-rapidapi-key: YOUR_API_KEY_HERE',
    'x-rapidapi-host: v3.football.api-sports.io'
  ),
));

$response = curl_exec($curl);
curl_close($curl);

$teams = json_decode($response, true);
?>
```

### Python

#### Get Team by Name
```python
import requests

url = "https://v3.football.api-sports.io/teams"
params = {
    'name': 'manchester united'
}

headers = {
    'x-rapidapi-key': 'YOUR_API_KEY_HERE',
    'x-rapidapi-host': 'v3.football.api-sports.io'
}

response = requests.get(url, headers=headers, params=params)
team = response.json()
```

#### Get Team Statistics
```python
import requests

url = "https://v3.football.api-sports.io/teams/statistics"
params = {
    'league': 39,
    'team': 33,
    'season': 2019
}

headers = {
    'x-rapidapi-key': 'YOUR_API_KEY_HERE',
    'x-rapidapi-host': 'v3.football.api-sports.io'
}

response = requests.get(url, headers=headers, params=params)
statistics = response.json()
```

### Node.js

#### Search Teams
```javascript
const axios = require('axios');

const config = {
  method: 'get',
  url: 'https://v3.football.api-sports.io/teams',
  params: {
    search: 'manches'
  },
  headers: {
    'x-rapidapi-key': 'YOUR_API_KEY_HERE',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  }
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});
```

#### Get Team Seasons
```javascript
const axios = require('axios');

const config = {
  method: 'get',
  url: 'https://v3.football.api-sports.io/teams/seasons',
  params: {
    team: 33
  },
  headers: {
    'x-rapidapi-key': 'YOUR_API_KEY_HERE',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  }
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});
```

### JavaScript (Browser)

#### Get Teams by Country
```javascript
const getTeamsByCountry = async (country) => {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/teams?country=${encodeURIComponent(country)}`, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": "YOUR_API_KEY_HERE"
      }
    });
    const data = await response.json();
    return data.response || [];
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
};

// Usage
getTeamsByCountry('england').then(teams => {
  console.log('Teams in England:', teams);
});
```

#### Get Team Statistics with Date
```javascript
const getTeamStatistics = async (leagueId, teamId, season, date = null) => {
  try {
    let url = `https://v3.football.api-sports.io/teams/statistics?league=${leagueId}&team=${teamId}&season=${season}`;
    
    if (date) {
      url += `&date=${date}`;
    }
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": "YOUR_API_KEY_HERE"
      }
    });
    const data = await response.json();
    return data.response || {};
  } catch (error) {
    console.error('Error fetching team statistics:', error);
    return {};
  }
};
```

### cURL

#### Get Team by ID
```bash
curl --request GET \
  --url 'https://v3.football.api-sports.io/teams?id=33' \
  --header 'x-rapidapi-host: v3.football.api-sports.io' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

#### Get Teams by League and Season
```bash
curl --request GET \
  --url 'https://v3.football.api-sports.io/teams?league=39&season=2019' \
  --header 'x-rapidapi-host: v3.football.api-sports.io' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

#### Get Team Statistics
```bash
curl --request GET \
  --url 'https://v3.football.api-sports.io/teams/statistics?league=39&team=33&season=2019' \
  --header 'x-rapidapi-host: v3.football.api-sports.io' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

#### Search Teams
```bash
curl --request GET \
  --url 'https://v3.football.api-sports.io/teams?search=manches' \
  --header 'x-rapidapi-host: v3.football.api-sports.io' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

### Ruby

#### Get Team by Code
```ruby
require 'uri'
require 'net/http'
require 'openssl'

url = URI("https://v3.football.api-sports.io/teams?code=FRA")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true
http.verify_mode = OpenSSL::SSL::VERIFY_NONE

request = Net::HTTP::Get.new(url)
request["x-rapidapi-host"] = 'v3.football.api-sports.io'
request["x-rapidapi-key"] = 'YOUR_API_KEY_HERE'

response = http.request(request)
puts response.read_body
```

#### Get Team Seasons
```ruby
require 'uri'
require 'net/http'
require 'openssl'

url = URI("https://v3.football.api-sports.io/teams/seasons?team=33")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true
http.verify_mode = OpenSSL::SSL::VERIFY_NONE

request = Net::HTTP::Get.new(url)
request["x-rapidapi-host"] = 'v3.football.api-sports.io'
request["x-rapidapi-key"] = 'YOUR_API_KEY_HERE'

response = http.request(request)
puts response.read_body
```

---

## Teams Response Examples

### Main Teams Endpoint Response (200)
```json
{
  "get": "teams",
  "parameters": {
    "id": "33"
  },
  "errors": [],
  "results": 1,
  "paging": {
    "current": 1,
    "total": 1
  },
  "response": [
    {
      "team": {
        "id": 33,
        "name": "Manchester United",
        "code": "MUN",
        "country": "England",
        "founded": 1878,
        "national": false,
        "logo": "https://media.api-sports.io/football/teams/33.png"
      },
      "venue": {
        "id": 556,
        "name": "Old Trafford",
        "city": "Manchester"
      }
    }
  ]
}
```

### Teams Statistics Response (200)
```json
{
  "get": "teams/statistics",
  "parameters": {
    "league": "39",
    "season": "2019",
    "team": "33"
  },
  "errors": [],
  "results": 11,
  "paging": {
    "current": 1,
    "total": 1
  },
  "response": {
    "league": {
      "id": 39,
      "name": "Premier League",
      "country": "England",
      "logo": "https://media.api-sports.io/leagues/39.png",
      "flag": "https://media.api-sports.io/flags/gb-eng.svg",
      "season": 2019
    },
    "team": {
      "id": 33,
      "name": "Manchester United",
      "logo": "https://media.api-sports.io/football/teams/33.png"
    },
    "form": "WDLDWLDLDWLWDDWWDLWWLWLLDWWDWDWWWWDWDW",
    "fixtures": {
      "played": {
        "home": 19,
        "away": 19,
        "total": 38
      },
      "wins": {
        "home": 10,
        "away": 8,
        "total": 18
      },
      "draws": {
        "home": 7,
        "away": 3,
        "total": 10
      },
      "loses": {
        "home": 2,
        "away": 8,
        "total": 10
      }
    },
    "goals": {
      "for": {
        "total": {
          "home": 36,
          "away": 28,
          "total": 64
        }
      },
      "against": {
        "total": {
          "home": 19,
          "away": 30,
          "total": 49
        }
      }
    },
    "biggest": {
      "streak": {
        "wins": 4,
        "draws": 2,
        "loses": 1
      },
      "wins": {
        "home": "4-0",
        "away": "3-1"
      },
      "loses": {
        "home": "0-2",
        "away": "1-3"
      },
      "goals": {
        "for": {
          "home": 4,
          "away": 3
        },
        "against": {
          "home": 2,
          "away": 3
        }
      }
    },
    "clean_sheet": {
      "home": 8,
      "away": 3,
      "total": 11
    },
    "failed_to_score": {
      "home": 3,
      "away": 6,
      "total": 9
    },
    "penalty": {
      "scored": {
        "total": 8,
        "percentage": "88.89%"
      },
      "missed": {
        "total": 1,
        "percentage": "11.11%"
      },
      "total": 9
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 15
      }
    ],
    "cards": {
      "yellow": {
        "0-15": {
          "total": 2,
          "percentage": "5.26%"
        },
        "16-30": {
          "total": 4,
          "percentage": "10.53%"
        }
      },
      "red": {
        "0-15": {
          "total": 0,
          "percentage": "0%"
        }
      }
    }
  }
}
```

### Teams Seasons Response (200)
```json
{
  "get": "teams/seasons",
  "parameters": {
    "team": "33"
  },
  "errors": [],
  "results": 1,
  "paging": {
    "current": 1,
    "total": 1
  },
  "response": [
    2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021
  ]
}
```

---

## Teams Implementation Best Practices

### 1. Caching Strategy
- **Cache Duration**: 24 hours for basic team data, 12 hours for statistics
- **Cache Key**: Include all parameters for unique caching
- **Invalidation**: Clear cache when team data is updated

### 2. Error Handling
```javascript
const handleTeamsResponse = (response) => {
  if (response.status === 200) {
    return response.json();
  } else if (response.status === 204) {
    return { teams: [] };
  } else if (response.status === 499) {
    throw new Error('Request timeout - try again');
  } else if (response.status === 500) {
    throw new Error('Server error - try again later');
  }
  throw new Error(`Unexpected status: ${response.status}`);
};
```

### 3. Parameter Validation
```javascript
const validateTeamsParams = (params) => {
  const errors = [];
  
  // Check if at least one parameter is provided
  if (Object.keys(params).length === 0) {
    errors.push('At least one parameter is required');
  }
  
  if (params.season && !/^\d{4}$/.test(params.season)) {
    errors.push('Season must be 4 digits (YYYY)');
  }
  
  if (params.code && params.code.length !== 3) {
    errors.push('Team code must be exactly 3 characters');
  }
  
  if (params.search && params.search.length < 3) {
    errors.push('Search term must be at least 3 characters');
  }
  
  return errors;
};
```

### 4. Team Logo Handling
```javascript
const getTeamLogo = (teamId) => {
  return `https://media.api-sports.io/football/teams/${teamId}.png`;
};

const displayTeamLogo = (teamId, elementId, fallbackSrc = 'default-team-logo.png') => {
  const img = document.createElement('img');
  img.src = getTeamLogo(teamId);
  img.alt = `Team ${teamId} logo`;
  img.onerror = () => {
    img.src = fallbackSrc;
  };
  
  document.getElementById(elementId).appendChild(img);
};
```

### 5. Batch Team Requests
```javascript
const getMultipleTeams = async (teamIds) => {
  const promises = teamIds.map(id => 
    fetch(`https://v3.football.api-sports.io/teams?id=${id}`, {
      headers: {
        'x-rapidapi-key': 'YOUR_API_KEY_HERE',
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    }).then(res => res.json())
  );
  
  try {
    const results = await Promise.all(promises);
    return results.map(result => result.response?.[0]).filter(Boolean);
  } catch (error) {
    console.error('Error fetching multiple teams:', error);
    return [];
  }
};
```

---

## Teams Common Use Cases

### 1. Team Selection Dropdown
```javascript
const populateTeamDropdown = async (leagueId, season) => {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`, {
      headers: {
        'x-rapidapi-key': 'YOUR_API_KEY_HERE',
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    const data = await response.json();
    const teams = data.response || [];
    
    const dropdown = document.getElementById('team-select');
    dropdown.innerHTML = '<option value="">Select a team</option>';
    
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.team.id;
      option.textContent = team.team.name;
      dropdown.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating teams:', error);
  }
};
```

### 2. Team Statistics Dashboard
```javascript
const displayTeamStatistics = async (leagueId, teamId, season) => {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/teams/statistics?league=${leagueId}&team=${teamId}&season=${season}`, {
      headers: {
        'x-rapidapi-key': 'YOUR_API_KEY_HERE',
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    const data = await response.json();
    const stats = data.response;
    
    if (stats) {
      document.getElementById('team-name').textContent = stats.team.name;
      document.getElementById('matches-played').textContent = stats.fixtures.played.total;
      document.getElementById('wins').textContent = stats.fixtures.wins.total;
      document.getElementById('draws').textContent = stats.fixtures.draws.total;
      document.getElementById('losses').textContent = stats.fixtures.loses.total;
      document.getElementById('goals-for').textContent = stats.goals.for.total.total;
      document.getElementById('goals-against').textContent = stats.goals.against.total.total;
    }
  } catch (error) {
    console.error('Error fetching team statistics:', error);
  }
};
```

### 3. Team Search with Autocomplete
```javascript
const searchTeams = async (searchTerm) => {
  if (searchTerm.length < 3) return [];
  
  try {
    const response = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(searchTerm)}`, {
      headers: {
        'x-rapidapi-key': 'YOUR_API_KEY_HERE',
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    const data = await response.json();
    return data.response || [];
  } catch (error) {
    console.error('Error searching teams:', error);
    return [];
  }
};

// Usage with debouncing
let searchTimeout;
const handleTeamSearch = (searchTerm) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const teams = await searchTeams(searchTerm);
    displaySearchResults(teams);
  }, 300);
};
```

---

## Teams Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 204 No Content | No teams match criteria | Check parameter values, verify team IDs exist |
| 499 Timeout | Network issues | Implement retry logic with exponential backoff |
| 500 Server Error | API server issues | Wait and retry, check API status |
| Missing required parameters | No parameters provided | Ensure at least one parameter is included |
| Invalid team codes | Wrong format | Use exactly 3 character codes (e.g., MUN, FRA) |
| Invalid season format | Wrong year format | Use 4-digit year (e.g., 2019, 2020) |

### Debugging Tips
1. **Check Parameters**: Verify all parameter values are correct and meet constraints
2. **Test with cURL**: Use cURL examples to test API directly
3. **Monitor Rate Limits**: Check your daily API usage
4. **Validate Team IDs**: Ensure team IDs exist in the API database
5. **Check Season Availability**: Verify the season exists for the specified team/league

### Performance Optimization
1. **Implement Caching**: Cache team data for 24 hours, statistics for 12 hours
2. **Batch Requests**: Use batch team requests when possible
3. **Lazy Loading**: Load team data only when needed
4. **Image Optimization**: Implement lazy loading for team logos

---

*Last Updated: [Current Date]*
*API Version: 3.9.3*
*Documentation Version: 1.0*
