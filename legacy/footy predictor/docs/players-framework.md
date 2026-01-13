# Players API Framework

## Overview
The Players API provides comprehensive access to player data, statistics, and rankings across various football competitions and seasons.

## Base URL
```
https://v3.football.api-sports.io
```

## Authentication
All endpoints require the following header:
- `x-rapidapi-key`: Your API key (required)

---

## Endpoints

### 1. Seasons
**Endpoint:** `GET /players/seasons`

Get all available seasons for players statistics.

**Update Frequency:** Daily  
**Recommended Calls:** 1 call per day

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `player` | integer | The ID of the player |

#### Request Examples
```javascript
// Get all seasons available for players endpoint
get("https://v3.football.api-sports.io/players/seasons");

// Get all seasons available for a specific player
get("https://v3.football.api-sports.io/players/seasons?player=276");
```

#### Response
```json
{
  "get": "players/seasons",
  "parameters": [],
  "errors": [],
  "results": 35,
  "paging": {
    "current": 1,
    "total": 1
  },
  "response": [
    1966, 1982, 1986, 1990, 1991, 1992, 1993, 1994, 1995,
    1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004,
    2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013,
    2014, 2015, 2016, 2017, 2018, 2019, 2020, 2022
  ]
}
```

---

### 2. Profiles
**Endpoint:** `GET /players/profiles`

Returns the list of all available players.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per week  
**Pagination:** 250 results per page

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `player` | integer | The ID of the player | - |
| `search` | string (≥3 chars) | The lastname of the player | - |
| `page` | integer | Page number for pagination | 1 |

#### Request Examples
```javascript
// Get data from one specific player
get("https://v3.football.api-sports.io/players/profiles?player=276");

// Search for a player by lastname
get("https://v3.football.api-sports.io/players/profiles?search=ney");

// Get all available players (use pagination)
get("https://v3.football.api-sports.io/players/profiles");
get("https://v3.football.api-sports.io/players/profiles?page=2");
get("https://v3.football.api-sports.io/players/profiles?page=3");
```

#### Player Photos
To get a player's photo, use:
```
https://media.api-sports.io/football/players/{player_id}.png
```

---

### 3. Statistics
**Endpoint:** `GET /players`

Get players statistics with comprehensive filtering options.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per day  
**Pagination:** 20 results per page

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `id` | integer | The ID of the player | No |
| `team` | integer | The ID of the team | No |
| `league` | integer | The ID of the league | No |
| `season` | integer (YYYY) | The season of the league | Yes* |
| `search` | string (≥4 chars) | The name of the player | No |
| `page` | integer | Page number for pagination | No |

*Required when using `id`, `league`, or `team` parameters

#### Request Examples
```javascript
// Get all players statistics from one player & season
get("https://v3.football.api-sports.io/players?id=19088&season=2018");

// Get all players statistics from one team & season
get("https://v3.football.api-sports.io/players?season=2018&team=33");
get("https://v3.football.api-sports.io/players?season=2018&team=33&page=2");

// Get all players statistics from one league & season
get("https://v3.football.api-sports.io/players?season=2018&league=61");
get("https://v3.football.api-sports.io/players?season=2018&league=61&page=4");

// Get all players statistics from league, team & season
get("https://v3.football.api-sports.io/players?season=2018&league=61&team=33");

// Search for a player by name
get("https://v3.football.api-sports.io/players?team=85&search=cavani");
get("https://v3.football.api-sports.io/players?league=61&search=cavani");
get("https://v3.football.api-sports.io/players?team=85&search=cavani&season=2018");
```

#### Player Rating System
The API includes a rating field that calculates player performance relative to other players in the same position (Attacker, Defender, Goalkeeper). Different algorithms are used based on position and performance metrics.

---

### 4. Squads
**Endpoint:** `GET /players/squads`

Return the current squad of a team or teams associated with a player.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per week

**Note:** This endpoint requires at least one parameter.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `team` | integer | The ID of the team |
| `player` | integer | The ID of the player |

#### Request Examples
```javascript
// Get all players from one team
get("https://v3.football.api-sports.io/players/squads?team=33");

// Get all teams from one player
get("https://v3.football.api-sports.io/players/squads?player=276");
```

---

### 5. Teams
**Endpoint:** `GET /players/teams`

Returns the list of teams and seasons in which the player played during their career.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per week

**Note:** This endpoint requires the `player` parameter.

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `player` | integer | The ID of the player | Yes |

#### Request Examples
```javascript
// Get all teams from one player
get("https://v3.football.api-sports.io/players/teams?player=276");
```

---

### 6. Top Scorers
**Endpoint:** `GET /players/topscorers`

Get the 20 best players for a league or cup.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per day

#### Ranking Criteria (in order of priority):
1. Highest number of goals
2. Fewest penalties scored
3. Highest number of goal assists
4. Goals scored in most matches
5. Fewest minutes played
6. Higher team position in table
7. Fewest red cards
8. Fewest yellow cards

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `league` | integer | The ID of the league | Yes |
| `season` | integer (YYYY) | The season of the league | Yes |

#### Request Examples
```php
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/players/topscorers');
$request->setRequestMethod('GET');
$request->setQuery(new http\QueryString(array(
    'season' => '2018',
    'league' => '61'
)));

$request->setHeaders(array(
    'x-rapidapi-host' => 'v3.football.api-sports.io',
    'x-rapidapi-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
```

---

### 7. Top Assists
**Endpoint:** `GET /players/topassists`

Get the 20 best players for assists in a league or cup.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per day

#### Ranking Criteria (in order of priority):
1. Highest number of goal assists
2. Highest number of goals
3. Fewest penalties scored
4. Assists in most matches
5. Fewest minutes played
6. Fewest red cards
7. Fewest yellow cards

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `league` | integer | The ID of the league | Yes |
| `season` | integer (YYYY) | The season of the league | Yes |

#### Request Examples
```php
$client = new http\Client;
$request = new http\Client\Request;

$request->setRequestUrl('https://v3.football.api-sports.io/players/topassists');
$request->setRequestMethod('GET');
$request->setQuery(new http\QueryString(array(
    'season' => '2020',
    'league' => '61'
)));

$request->setHeaders(array(
    'x-rapidapi-host' => 'v3.football.api-sports.io',
    'x-rapidapi-key' => 'XxXxXxXxXxXxXxXxXxXxXxXx'
));

$client->enqueue($request)->send();
$response = $client->getResponse();

echo $response->getBody();
```

---

### 8. Top Yellow Cards
**Endpoint:** `GET /players/topyellowcards`

Get the 20 players with the most yellow cards for a league or cup.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per day

#### Ranking Criteria (in order of priority):
1. Highest number of yellow cards
2. Highest number of red cards
3. Assists in most matches
4. Fewest minutes played

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `league` | integer | The ID of the league | Yes |
| `season` | integer (YYYY) | The season of the league | Yes |

---

### 9. Top Red Cards
**Endpoint:** `GET /players/topredcards`

Get the 20 players with the most red cards for a league or cup.

**Update Frequency:** Several times per week  
**Recommended Calls:** 1 call per day

#### Ranking Criteria (in order of priority):
1. Highest number of red cards
2. Highest number of yellow cards
3. Assists in most matches
4. Fewest minutes played

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `league` | integer | The ID of the league | Yes |
| `season` | integer (YYYY) | The season of the league | Yes |

---

## Response Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 204 | No Content - No data available |
| 499 | Time Out - Request timed out |
| 500 | Internal Server Error - Server error |

## Best Practices

1. **Rate Limiting:** Follow the recommended call frequencies for each endpoint
2. **Pagination:** Use pagination parameters for endpoints that return large datasets
3. **Caching:** Cache responses according to update frequencies to minimize API calls
4. **Error Handling:** Implement proper error handling for all status codes
5. **Parameter Validation:** Ensure required parameters are provided and optional parameters meet format requirements

## Tutorials

### How to Get All Teams and Players from a League ID
Use the `/players` endpoint with `league` and `season` parameters, then implement pagination to retrieve all results.

## Notes

- Player IDs are unique across the API and remain consistent across all teams
- Statistics are calculated per team, league, and season combination
- Player photos are available via the media API endpoint
- Some endpoints may return empty response objects `{}` in the response array
- The API supports multiple programming languages and frameworks
