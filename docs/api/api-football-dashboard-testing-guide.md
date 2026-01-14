# API-Football Dashboard Testing Guide

## Overview

Use the official API-Football dashboard tester to experiment with API calls without consuming your app's daily quota. This guide shows you how to use it effectively.

## Accessing the Dashboard Tester

1. **Login to Dashboard**
   - Go to: https://dashboard.api-football.com/
   - Login with your API-Football account

2. **Navigate to API Tester**
   - Click on "API" in the sidebar
   - Select "Live Tester" or go to "Documentation" → "Endpoints"

## Testing Fixtures Endpoint

### Step-by-Step Process

1. **Select Endpoint**
   - Choose: `GET /fixtures`
   - This is the endpoint we use for fetching fixtures

2. **Set Parameters**
   Use the form fields or query parameters:

   ```
   league: 39 (Premier League)
   from: 2026-01-18
   to: 2026-01-21
   season: 2025
   timezone: UTC
   ```

3. **Make Test Call**
   - Click "Send Request" or "Test"
   - Review the response

4. **Analyze Results**
   - Check if `results` > 0
   - Look at `response` array for fixture data
   - Check `errors` object for any issues

## Test Cases to Try

### Test 1: Premier League - Jan 18-21, 2026
**Parameters:**
```
league: 39
from: 2026-01-18
to: 2026-01-21
season: 2025
timezone: UTC
```
**Expected:** Should return fixtures for Saturday Jan 19

### Test 2: Without Season Parameter
**Parameters:**
```
league: 39
from: 2026-01-18
to: 2026-01-21
timezone: UTC
```
**Expected:** May return error about missing season, or may work if API auto-calculates

### Test 3: Wrong Season
**Parameters:**
```
league: 39
from: 2026-01-18
to: 2026-01-21
season: 2024
timezone: UTC
```
**Expected:** Should return 0 results (wrong season for Jan 2026)

### Test 4: All Leagues (No League Filter)
**Parameters:**
```
from: 2026-01-18
to: 2026-01-21
season: 2025
timezone: UTC
```
**Expected:** Should return fixtures from all leagues

## Understanding the Response

### Successful Response Structure
```json
{
  "get": "fixtures",
  "parameters": {
    "league": "39",
    "from": "2026-01-18",
    "to": "2026-01-21",
    "season": "2025",
    "timezone": "UTC"
  },
  "errors": {},
  "results": 10,
  "paging": {
    "current": 1,
    "total": 1
  },
  "response": [
    {
      "fixture": {
        "id": 123456,
        "date": "2026-01-19T15:00:00+00:00",
        "status": {...}
      },
      "teams": {...},
      "league": {...}
    }
  ]
}
```

### Key Fields to Check
- `results`: Number of fixtures found (0 = no fixtures)
- `errors`: Any error messages (empty object = no errors)
- `response`: Array of fixture objects
- `response[0].fixture.date`: Date/time of first fixture
- `response[0].teams.home.name`: Home team name
- `response[0].teams.away.name`: Away team name

### Error Response Structure
```json
{
  "get": "fixtures",
  "parameters": {...},
  "errors": {
    "season": "The Season field is required."
  },
  "results": 0,
  "response": []
}
```

## What to Document

When testing on the dashboard, document:

1. **Parameters Used**
   - League ID
   - Date range
   - Season
   - Any other parameters

2. **Results**
   - Number of fixtures returned
   - Sample fixture data
   - Any errors

3. **Observations**
   - What worked
   - What didn't work
   - Any unexpected behavior

4. **Season Calculation**
   - What season worked for January dates?
   - What season worked for August dates?
   - Does the API require explicit season or can it calculate?

## Copying Results to Our App

Once you find working parameters:

1. **Note the exact parameters** that worked
2. **Test in our app** using the same parameters
3. **Compare results** - should match
4. **Update our code** if needed based on findings

## Example: Testing Jan 18-21, 2026

### On Dashboard:
```
Endpoint: GET /fixtures
Parameters:
  league: 39
  from: 2026-01-18
  to: 2026-01-21
  season: 2025
  timezone: UTC
```

### Expected Result:
- Should return fixtures for Saturday Jan 19
- Results should be > 0
- Response array should contain fixture objects

### If It Works:
- Copy these exact parameters
- Test in our app with same parameters
- Verify we get same results

### If It Doesn't Work:
- Try season 2024 (might be wrong)
- Try without season parameter
- Check error messages
- Try different date ranges

## Tips

1. **Start Simple**: Test one league, one date range first
2. **Document Everything**: Write down what works and what doesn't
3. **Compare Seasons**: Test with different seasons to understand the pattern
4. **Check Weekends**: Weekends typically have more fixtures
5. **Use Short Ranges**: 1-3 day ranges are easier to verify

## Next Steps

After dashboard testing:
1. Update our test suite with working parameters
2. Fix any issues in our season calculation
3. Run tests in our app to verify
4. Update documentation with findings
