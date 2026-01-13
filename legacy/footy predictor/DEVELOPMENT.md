# 🛠️ Footy Picker Development Guide

## Overview

This guide provides comprehensive instructions for setting up, developing, and maintaining the Footy Picker application.

---

## 🚀 **Development Environment Setup**

### **Prerequisites**

- **Node.js** 16+ and npm
- **Git** for version control
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Modern web browser** with ES6+ support
- **Code editor** (VS Code recommended)

### **Initial Setup**

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd footy-predictor
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install Cloud Functions dependencies
   cd functions && npm install && cd ..
   ```

3. **Firebase Configuration**
   ```bash
   # Login to Firebase
   firebase login
   
   # Initialize Firebase project
   firebase init
   
   # Select your project and configure:
   # - Hosting: public directory
   # - Firestore: rules and indexes
   # - Functions: JavaScript
   ```

4. **Environment Setup**
   ```bash
   # Create environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

---

## 🔧 **Configuration Files**

### **Firebase Configuration**

Update `public/js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export { app };
```

### **API Configuration**

Update `public/index.html` and `public/admin.html`:

```html
<meta name="api-sports-key" content="YOUR_API_FOOTBALL_KEY" />
```

### **Environment Variables**

Create `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com

# API Configuration
API_FOOTBALL_KEY=your-api-football-key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

# Development Settings
NODE_ENV=development
DEBUG=true
```

---

## 🏗️ **Project Structure**

### **Directory Layout**

```
footy-predictor/
├── public/                 # Frontend assets
│   ├── js/                # JavaScript modules
│   │   ├── app.js         # Main application
│   │   ├── auth.js        # Authentication
│   │   ├── api.js         # API integration
│   │   ├── scoring.js     # Scoring logic
│   │   ├── leaderboard.js # Leaderboard
│   │   ├── profile.js     # User profiles
│   │   ├── nav.js         # Navigation
│   │   └── firebase-config.js # Firebase setup
│   ├── index.html         # Main page
│   ├── admin.html         # Admin dashboard
│   ├── leaderboard.html   # Leaderboard page
│   ├── profile.html       # Profile page
│   ├── style.css          # Main styles
│   └── admin.css          # Admin styles
├── functions/              # Cloud Functions
│   ├── index.js           # Function definitions
│   ├── package.json       # Dependencies
│   └── .eslintrc.js       # Linting rules
├── docs/                   # Documentation
├── firebase.json           # Firebase config
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Database indexes
├── package.json            # Root dependencies
└── README.md               # Project overview
```

### **Module Dependencies**

```javascript
// Dependency Graph
app.js
├── auth.js
├── api.js
├── scoring.js
└── nav.js

auth.js
├── firebase-config.js
└── firebase-auth.js

api.js
├── api-football.js
└── auth.js

scoring.js
└── auth.js
```

---

## 🚀 **Development Workflow**

### **Local Development**

1. **Start Firebase emulators**
   ```bash
   firebase emulators:start
   ```

2. **Open development server**
   ```bash
   firebase serve
   ```

3. **Access your app**
   - Main app: `http://localhost:5000`
   - Admin panel: `http://localhost:5000/admin.html`
   - Emulator UI: `http://localhost:4000`

### **Development Commands**

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code

# Firebase
firebase serve       # Local development
firebase deploy      # Deploy to production
firebase functions:log # View function logs
```

### **Hot Reloading**

The development server automatically reloads when you make changes to:
- HTML files
- CSS files
- JavaScript files

---

## 📝 **Coding Standards**

### **JavaScript Style Guide**

```javascript
// Use ES6+ features
const user = { name: 'John', age: 30 };
const { name, age } = user;

// Use arrow functions for callbacks
const users = fixtures.map(fixture => fixture.teams.home.name);

// Use template literals
const message = `Welcome, ${user.displayName}!`;

// Use async/await for promises
async function loadFixtures() {
  try {
    const response = await fetch('/api/fixtures');
    return await response.json();
  } catch (error) {
    console.error('Failed to load fixtures:', error);
    throw error;
  }
}

// Use meaningful variable names
const fixtureId = fixture.id;
const homeTeamName = fixture.teams.home.name;
const isPredictionValid = prediction && ['H', 'D', 'A'].includes(prediction);
```

### **CSS Style Guide**

```css
/* Use CSS custom properties for theming */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --border-radius: 14px;
  --spacing-unit: 1rem;
}

/* Use BEM methodology for component classes */
.match-card { }
.match-card__header { }
.match-card__content { }
.match-card--featured { }

/* Use utility classes for common patterns */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }

/* Use mobile-first responsive design */
.container {
  width: 100%;
  padding: 0 var(--spacing-unit);
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
    margin: 0 auto;
  }
}
```

### **HTML Structure**

```html
<!-- Use semantic HTML elements -->
<main class="container">
  <section class="fixtures" aria-labelledby="fixtures-title">
    <h2 id="fixtures-title">This Weekend's Fixtures</h2>
    <div class="fixtures-grid" role="grid">
      <!-- Fixture cards -->
    </div>
  </section>
</main>

<!-- Use proper ARIA labels -->
<button 
  class="prediction-btn" 
  data-choice="H"
  aria-label="Predict home team win"
  aria-pressed="false">
  Home
</button>

<!-- Use data attributes for JavaScript hooks -->
<div class="match-card" data-fixture-id="12345">
  <!-- Match content -->
</div>
```

---

## 🧪 **Testing Strategy**

### **Manual Testing Checklist**

#### **User Authentication**
- [ ] User can sign up with valid email/password
- [ ] User can sign in with existing credentials
- [ ] User can sign out successfully
- [ ] Authentication state persists across page reloads
- [ ] Invalid credentials show appropriate error messages

#### **Match Predictions**
- [ ] User can view available fixtures
- [ ] User can select predictions (H/D/A)
- [ ] Predictions are saved locally and to server
- [ ] Prediction deadline is enforced correctly
- [ ] User cannot modify predictions after deadline

#### **Scoring System**
- [ ] Points are calculated correctly for correct predictions
- [ ] Leaderboard updates in real-time
- [ ] Historical predictions are preserved
- [ ] User rankings are accurate

#### **Admin Functions**
- [ ] Admin can create new weeks
- [ ] Admin can curate fixtures
- [ ] Admin can manage user permissions
- [ ] Admin can view system statistics

### **Automated Testing**

```javascript
// Example test structure
describe('Authentication', () => {
  test('User can sign up with valid credentials', async () => {
    const user = await signUp('test@example.com', 'password123');
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  test('User cannot sign up with invalid email', async () => {
    try {
      await signUp('invalid-email', 'password123');
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.code).toBe('auth/invalid-email');
    }
  });
});

describe('Predictions', () => {
  test('Prediction is saved correctly', async () => {
    const prediction = await savePrediction('user123', 'fixture456', 'H');
    expect(prediction.pick).toBe('H');
    expect(prediction.fixtureId).toBe('fixture456');
  });
});
```

---

## 🔍 **Debugging Guide**

### **Browser Developer Tools**

#### **Console Logging**
```javascript
// Use structured logging
console.group('Fixture Loading');
console.log('Loading fixtures for week:', weekId);
console.log('API response:', fixtures);
console.groupEnd();

// Use different log levels
console.info('User authenticated:', user.uid);
console.warn('API rate limit approaching');
console.error('Failed to save prediction:', error);
```

#### **Network Tab**
- Monitor API calls to API-Football
- Check Firebase requests
- Verify authentication tokens
- Monitor response times

#### **Application Tab**
- Check localStorage for offline data
- Verify Firebase configuration
- Monitor authentication state

### **Firebase Debugging**

```bash
# View function logs
firebase functions:log

# View hosting logs
firebase hosting:log

# View Firestore logs
firebase firestore:log

# Debug specific function
firebase functions:log --only functionName
```

### **Common Issues & Solutions**

#### **Authentication Errors**
```javascript
// Check if user is authenticated
if (!auth.currentUser) {
  console.error('No authenticated user');
  return;
}

// Verify token validity
try {
  await auth.currentUser.getIdToken(true);
} catch (error) {
  console.error('Token refresh failed:', error);
  // Redirect to login
}
```

#### **API Rate Limiting**
```javascript
// Implement exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

#### **Firestore Permission Errors**
```javascript
// Check security rules
// Ensure user document exists before writing predictions
await ensureUserDoc(user.uid, user.displayName);

// Check if user has admin privileges
const isAdmin = await checkAdminStatus(user.uid);
```

---

## 🚀 **Deployment Process**

### **Pre-deployment Checklist**

- [ ] All tests pass
- [ ] Code is linted and formatted
- [ ] Environment variables are set
- [ ] API keys are configured
- [ ] Firebase project is selected
- [ ] Database rules are tested

### **Deployment Commands**

```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy to specific project
firebase deploy --project your-project-id
```

### **Environment-Specific Deployments**

```bash
# Development
firebase use development
firebase deploy

# Staging
firebase use staging
firebase deploy

# Production
firebase use production
firebase deploy
```

---

## 📊 **Performance Optimization**

### **Frontend Optimization**

```javascript
// Lazy load non-critical modules
const loadModule = async (moduleName) => {
  const module = await import(`./modules/${moduleName}.js`);
  return module.default;
};

// Debounce frequent operations
const debouncedSearch = debounce(searchFixtures, 300);

// Use Intersection Observer for lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadImage(entry.target);
      observer.unobserve(entry.target);
    }
  });
});
```

### **Backend Optimization**

```javascript
// Implement caching for API responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key, fetchFunction) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Batch Firestore operations
const batch = db.batch();
predictions.forEach(prediction => {
  const ref = db.collection('predictions').doc(prediction.fixtureId);
  batch.set(ref, prediction);
});
await batch.commit();
```

---

## 🔒 **Security Best Practices**

### **Input Validation**

```javascript
// Validate user input
const validatePrediction = (prediction) => {
  if (!prediction || !['H', 'D', 'A'].includes(prediction)) {
    throw new Error('Invalid prediction value');
  }
  return prediction;
};

// Sanitize HTML content
const sanitizeHTML = (input) => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};
```

### **Authentication Security**

```javascript
// Verify user identity before operations
const verifyUser = async (uid) => {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    throw new Error('User identity verification failed');
  }
  return user;
};

// Implement session timeout
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  if (auth.currentUser) {
    const lastActivity = localStorage.getItem('lastActivity');
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      auth.signOut();
    }
  }
}, 60000); // Check every minute
```

---

## 📚 **Documentation Standards**

### **Code Documentation**

```javascript
/**
 * Saves user predictions to Firestore
 * @param {string} uid - User ID
 * @param {Object} choices - Prediction choices { fixtureId: 'H'|'D'|'A' }
 * @param {Object} fixturesData - Additional fixture metadata
 * @returns {Promise<void>}
 * @throws {Error} When user is not authenticated or database is unavailable
 */
async function savePredictions(uid, choices, fixturesData = null) {
  // Implementation
}
```

### **API Documentation**

```javascript
/**
 * @api {GET} /api/fixtures Get fixtures for a date range
 * @apiName GetFixtures
 * @apiGroup Fixtures
 * @apiVersion 1.0.0
 * 
 * @apiParam {string} from Start date (YYYY-MM-DD)
 * @apiParam {string} to End date (YYYY-MM-DD)
 * @apiParam {string} [league] League ID filter
 * 
 * @apiSuccess {Object[]} fixtures List of fixtures
 * @apiSuccess {string} fixtures.id Fixture ID
 * @apiSuccess {Object} fixtures.teams Team information
 * @apiSuccess {Object} fixtures.league League information
 * 
 * @apiError {string} error Error message
 */
```

---

## 🤝 **Contributing Guidelines**

### **Pull Request Process**

1. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   # Create PR on GitHub
   ```

### **Commit Message Format**

```
type(scope): description

feat(auth): add password reset functionality
fix(scoring): correct point calculation for draws
docs(api): update API documentation
style(ui): improve button hover states
refactor(scoring): simplify prediction validation
test(auth): add authentication test suite
```

### **Code Review Checklist**

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Accessibility requirements met

---

## 🆘 **Getting Help**

### **Resources**

- **Firebase Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **API-Football Documentation**: [www.api-football.com/documentation](https://www.api-football.com/documentation)
- **MDN Web Docs**: [developer.mozilla.org](https://developer.mozilla.org)

### **Support Channels**

- **GitHub Issues**: Report bugs and feature requests
- **GitHub Discussions**: Ask questions and share ideas
- **Firebase Support**: [firebase.google.com/support](https://firebase.google.com/support)

### **Community**

- **Firebase Community**: [firebase.community](https://firebase.community)
- **Stack Overflow**: Tag questions with `firebase` and `javascript`
- **Discord**: Join development communities

---

This development guide provides a comprehensive foundation for working with the Footy Picker application. Follow these guidelines to ensure code quality, maintainability, and team collaboration.
