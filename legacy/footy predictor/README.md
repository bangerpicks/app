# ⚽ Footy Picker

A modern, real-time football prediction platform built with Firebase and vanilla JavaScript.

## 🚀 Features

- **Real-time Match Predictions**: Predict Home Win, Draw, or Away Win for curated weekend fixtures
- **Live Scoring**: Automatic point calculation and real-time leaderboard updates
- **User Management**: Secure authentication with customizable profiles and favorite teams
- **Admin Dashboard**: Comprehensive tools for week management and fixture curation
- **Responsive Design**: Mobile-first interface that works on all devices
- **Offline Support**: Local storage with server synchronization

## 🏗️ Architecture

- **Frontend**: Vanilla JavaScript (ES6+) with ES modules
- **Backend**: Firebase (Hosting, Authentication, Firestore, Cloud Functions)
- **Data**: API-Football integration for live match data
- **Styling**: Modern CSS with custom properties and responsive design

## 📋 Prerequisites

- Node.js 16+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- API-Football account and API key
- Modern web browser with ES6+ support

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd footy-predictor
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install
   ```

3. **Firebase Setup**
   ```bash
   firebase login
   firebase init
   ```

4. **Configure API Keys**
   - Add your API-Football key to `public/index.html` and `public/admin.html`:
     ```html
     <meta name="api-sports-key" content="YOUR_API_KEY" />
     ```
   - Set Firebase secrets:
     ```bash
     firebase functions:secrets:set RAPIDAPI_KEY
     ```

5. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
FIREBASE_PROJECT_ID=your-project-id
API_FOOTBALL_KEY=your-api-key
```

### Firebase Configuration

Update `public/js/firebase-config.js` with your Firebase project settings:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 🚀 Usage

### For Users

1. **Sign Up/Login**: Create an account or sign in with existing credentials
2. **View Fixtures**: Browse curated weekend matches with team information
3. **Make Predictions**: Select Home Win (H), Draw (D), or Away Win (A) for each match
4. **Submit Picks**: Submit predictions before the deadline (1 hour before first kickoff)
5. **Track Performance**: View your points and ranking on the leaderboard

### For Admins

1. **Access Admin Panel**: Navigate to `/admin.html` with admin privileges
2. **Manage Weeks**: Create, edit, and activate prediction weeks
3. **Curate Fixtures**: Select and manage matches for each weekend
4. **Monitor Scoring**: Oversee automatic point calculation and user rankings

## 📁 Project Structure

```
footy-predictor/
├── public/                 # Frontend assets
│   ├── js/                # JavaScript modules
│   │   ├── app.js         # Main application logic
│   │   ├── auth.js        # Authentication handling
│   │   ├── api.js         # API integration
│   │   ├── scoring.js     # Scoring and Firestore operations
│   │   └── ...
│   ├── index.html         # Main user interface
│   ├── admin.html         # Admin dashboard
│   └── style.css          # Main stylesheet
├── functions/              # Firebase Cloud Functions
│   ├── index.js           # API proxy and auto-scoring
│   └── package.json       # Function dependencies
├── docs/                   # Documentation
├── firebase.json           # Firebase configuration
└── firestore.rules         # Database security rules
```

## 🔌 API Integration

### API-Football Endpoints

The application integrates with API-Football for live match data:

- **Fixtures**: Get match information and results
- **Teams**: Team details, logos, and statistics
- **Leagues**: Competition information and standings
- **Live Data**: Real-time scores and match status

### Custom Endpoints

- `GET /api/*` - Proxied API-Football requests
- Auto-scoring function runs every 5 minutes

## 🗄️ Database Schema

### Firestore Collections

- **users/{uid}**: User profiles and preferences
- **predictions/{fixtureId}/entries/{uid}**: User predictions and results
- **weeklySelections/{weekId}/fixtures/{fixtureId}**: Curated fixtures
- **weeks/{weekId}**: Week management and status
- **settings/app**: Application configuration and admin users

## 🔒 Security

- **Authentication**: Firebase Auth with email/password
- **Authorization**: Role-based access control (admin vs regular users)
- **Data Protection**: Firestore security rules
- **API Security**: Domain-restricted API keys

## 🚀 Deployment

### Development

```bash
firebase serve
```

### Production

```bash
firebase deploy
```

### Functions Only

```bash
firebase deploy --only functions
```

## 🧪 Testing

### Manual Testing

- Test user registration and authentication
- Verify prediction submission and scoring
- Check admin functionality and week management
- Test responsive design on different devices

### Debug Tools

The application includes several debug functions accessible via browser console:

```javascript
// Test Firebase operations
window.testFirebaseOperations()

// Test match loading
window.testMatchLoading()

// Test API functions
window.testAPIFunctions()

// Test Firebase status
window.testFirebaseStatus()
```

## 📊 Performance

- **Lazy Loading**: JavaScript modules loaded on demand
- **Debounced API Calls**: Prevents rate limiting
- **Efficient DOM Updates**: Template-based rendering
- **Offline Support**: Local storage with sync capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔄 Changelog

See [CHANGELOG.md](docs/changelog.md) for a complete history of changes and updates.

## 🙏 Acknowledgments

- **API-Football** for comprehensive football data
- **Firebase** for robust backend infrastructure
- **Inter font family** for beautiful typography

---

**Built with ❤️ for football fans everywhere**
