# Logos & Images Documentation

## Overview

The API Football service provides access to logos, images, and visual assets for leagues, teams, players, and venues. These assets are provided free of charge and do not count towards your daily API quota.

## Key Information

### Free Usage
- **No Daily Quota Impact**: Logo and image calls are completely free
- **Rate Limits**: Subject to per-second and per-minute rate limits
- **Recommended**: Cache images locally to improve performance and user experience

### Intellectual Property Notice
⚠️ **Important**: The API provider does not own these visual assets and makes no intellectual property claims. Usage may require additional licensing from rights holders.

- Logos and images are for identification and descriptive purposes only
- Some content may be subject to third-party intellectual property rights
- You are responsible for ensuring compliance with applicable laws
- The API provider is not affiliated with, sponsored by, or endorsed by any sports entities

## Best Practices

### Image Caching Strategy
1. **Implement Local Storage**: Save frequently accessed images to reduce API calls
2. **Use CDN Services**: Consider services like BunnyCDN for optimal delivery
3. **Cache Management**: Implement proper cache invalidation strategies
4. **Performance Optimization**: Avoid repeated API calls for the same images

### Rate Limiting Considerations
- Monitor your application's image request frequency
- Implement request throttling if necessary
- Use local caching to minimize API calls

## Code Examples

### JavaScript (Fetch API)

```javascript
const fetchTeamLogo = async (teamId) => {
  const headers = {
    'x-rapidapi-key': 'YOUR_API_KEY',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  try {
    const response = await fetch(`https://v3.football.api-sports.io/teams?id=${teamId}`, {
      method: 'GET',
      headers: headers
    });
    
    const data = await response.json();
    return data.response[0]?.team?.logo;
  } catch (error) {
    console.error('Error fetching team logo:', error);
    return null;
  }
};
```

### JavaScript (jQuery)

```javascript
const getTeamLogo = (teamId) => {
  const settings = {
    url: `https://v3.football.api-sports.io/teams?id=${teamId}`,
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'YOUR_API_KEY',
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  };

  $.ajax(settings)
    .done(function(response) {
      const logoUrl = response.response[0]?.team?.logo;
      if (logoUrl) {
        displayTeamLogo(logoUrl);
      }
    })
    .fail(function(error) {
      console.error('Failed to fetch team logo:', error);
    });
};
```

### Node.js (Axios)

```javascript
const axios = require('axios');

const fetchLeagueLogo = async (leagueId) => {
  const config = {
    method: 'get',
    url: `https://v3.football.api-sports.io/leagues?id=${leagueId}`,
    headers: {
      'x-rapidapi-key': 'YOUR_API_KEY',
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  };

  try {
    const response = await axios(config);
    return response.data.response[0]?.league?.logo;
  } catch (error) {
    console.error('Error fetching league logo:', error);
    return null;
  }
};
```

### Python (Requests)

```python
import requests

def get_team_logo(team_id):
    url = f"https://v3.football.api-sports.io/teams?id={team_id}"
    
    headers = {
        'x-rapidapi-key': 'YOUR_API_KEY',
        'x-rapidapi-host': 'v3.football.api-sports.io'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if data['response'] and len(data['response']) > 0:
            return data['response'][0]['team']['logo']
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching team logo: {e}")
        return None
```

### PHP (cURL)

```php
function getLeagueLogo($leagueId) {
    $curl = curl_init();
    
    curl_setopt_array($curl, array(
        CURLOPT_URL => "https://v3.football.api-sports.io/leagues?id={$leagueId}",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'x-rapidapi-key: YOUR_API_KEY',
            'x-rapidapi-host: v3.football.api-sports.io'
        ),
    ));
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    
    curl_close($curl);
    
    if ($err) {
        return null;
    }
    
    $data = json_decode($response, true);
    return $data['response'][0]['league']['logo'] ?? null;
}
```

### C# (RestSharp)

```csharp
using RestSharp;

public string GetTeamLogo(int teamId)
{
    var client = new RestClient($"https://v3.football.api-sports.io/teams?id={teamId}");
    client.Timeout = -1;
    
    var request = new RestRequest(Method.GET);
    request.AddHeader("x-rapidapi-key", "YOUR_API_KEY");
    request.AddHeader("x-rapidapi-host", "v3.football.api-sports.io");
    
    IRestResponse response = client.Execute(request);
    
    if (response.IsSuccessful)
    {
        var data = JsonConvert.DeserializeObject<dynamic>(response.Content);
        return data.response[0].team.logo;
    }
    
    return null;
}
```

## Image Caching Implementation

### Local Storage Example (JavaScript)

```javascript
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
  }

  async getImage(url, teamId) {
    const cacheKey = `team_${teamId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.dataUrl;
    }
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      
      this.cache.set(cacheKey, {
        dataUrl,
        timestamp: Date.now()
      });
      
      return dataUrl;
    } catch (error) {
      console.error('Error caching image:', error);
      return url; // Fallback to original URL
    }
  }

  blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Usage
const imageCache = new ImageCache();
const logoUrl = await imageCache.getImage(teamLogoUrl, teamId);
```

## Error Handling

### Common Issues and Solutions

1. **Rate Limiting**
   - Implement exponential backoff
   - Use local caching to reduce API calls
   - Monitor request frequency

2. **Image Loading Failures**
   - Provide fallback images
   - Implement retry logic
   - Handle network timeouts gracefully

3. **Invalid Image URLs**
   - Validate URLs before use
   - Check image dimensions and format
   - Implement error boundaries

## Security Considerations

- **API Key Protection**: Never expose API keys in client-side code
- **HTTPS Usage**: Always use HTTPS for API calls
- **Input Validation**: Validate all parameters before making requests
- **Error Information**: Avoid exposing sensitive error details to users

## Performance Optimization

1. **Lazy Loading**: Load images only when needed
2. **Image Compression**: Use appropriate image formats and sizes
3. **CDN Integration**: Leverage content delivery networks
4. **Progressive Loading**: Implement progressive image loading
5. **Memory Management**: Clear unused cached images

## Monitoring and Analytics

- Track image request success rates
- Monitor cache hit/miss ratios
- Measure image loading performance
- Set up alerts for rate limit approaching

## Support and Resources

- **API Documentation**: [API Football Official Docs](https://www.api-football.com/)
- **BunnyCDN Tutorial**: [Media System Setup Guide](https://bunny.net/)
- **Rate Limit Information**: Check your dashboard for current limits
- **Community Support**: Join developer forums for assistance

---

*Last updated: [Current Date]*
*Version: 1.0*
