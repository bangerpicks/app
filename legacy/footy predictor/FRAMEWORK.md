# 🏗️ Footy Picker Technical Framework

## Overview

This document outlines the technical architecture, design patterns, and development framework for the Footy Picker application.

---

## 🎯 **Architecture Principles**

### **1. Modular Design**
- **ES6 Modules**: Clean separation of concerns with import/export
- **Single Responsibility**: Each module handles one specific domain
- **Loose Coupling**: Modules communicate through well-defined interfaces

### **2. Progressive Enhancement**
- **Core Functionality First**: Essential features work without JavaScript
- **Graceful Degradation**: Fallbacks for unsupported features
- **Accessibility First**: ARIA labels and semantic HTML throughout

### **3. Performance Optimization**
- **Lazy Loading**: JavaScript modules loaded on demand
- **Debounced Operations**: Prevents excessive API calls
- **Efficient DOM Updates**: Template-based rendering with minimal reflows

---

## 🏛️ **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Firebase      │    │   External      │
│   (Browser)     │◄──►│   Backend       │◄──►│   APIs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Storage │    │   Firestore     │    │   API-Football  │
│   (Offline)     │    │   (Real-time)   │    │   (Live Data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Data Flow Architecture**

1. **User Input** → Local Storage (immediate feedback)
2. **Local Storage** → Firestore (server persistence)
3. **Firestore** → Real-time Updates (live synchronization)
4. **External APIs** → Cloud Functions (secure proxy)
5. **Cloud Functions** → Auto-scoring (background processing)

---

## 🔧 **Frontend Framework**

### **Module Structure**

```javascript
// Core Application Module
app.js
├── User Interface Management
├── State Management
├── Event Handling
└── Application Lifecycle

// Authentication Module
auth.js
├── Firebase Auth Integration
├── User Session Management
├── Profile Updates
└── Security Validation

// API Integration Module
api.js
├── External API Calls
├── Data Transformation
├── Error Handling
└── Rate Limiting

// Scoring Module
scoring.js
├── Prediction Management
├── Point Calculation
├── Leaderboard Updates
└── Data Persistence
```

### **State Management Pattern**

```javascript
// Centralized State Object
const appState = {
  user: null,
  currentWeek: null,
  fixtures: [],
  predictions: {},
  ui: {
    loading: false,
    error: null,
    view: 'default'
  }
};

// State Update Functions
function updateState(updates) {
  Object.assign(appState, updates);
  renderUI();
}

// Reactive UI Updates
function renderUI() {
  // Update DOM based on state changes
}
```

---

## 🗄️ **Database Framework**

### **Firestore Schema Design**

```javascript
// Users Collection
users/{uid}
{
  displayName: string,
  email: string,
  photoURL: string,
  points: number,
  favoriteTeam: object,
  favoritePlayer: object,
  createdAt: timestamp,
  updatedAt: timestamp
}

// Predictions Collection
predictions/{fixtureId}/entries/{uid}
{
  pick: 'H' | 'D' | 'A',
  awarded: boolean,
  points: number,
  ts: timestamp,
  homeTeam: object,
  awayTeam: object,
  league: object,
  fixtureDate: timestamp,
  status: string,
  result: object
}

// Weekly Selections Collection
weeklySelections/{weekId}/fixtures/{fixtureId}
{
  fixture: object,
  teams: object,
  league: object,
  status: string,
  addedBy: string,
  addedAt: timestamp
}

// Weeks Collection
weeks/{weekId}
{
  name: string,
  fromDate: string,
  toDate: string,
  status: 'draft' | 'active' | 'completed' | 'archived',
  description: string,
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### **Security Rules Pattern**

```javascript
// Role-based Access Control
function isAdmin() {
  return request.auth != null &&
    get(/databases/$(database)/documents/settings/app).data.adminUids.hasAny([request.auth.uid]);
}

// User Data Protection
match /users/{uid} {
  allow read: if true;
  allow create: if request.auth != null && request.auth.uid == uid;
  allow update: if request.auth != null && request.auth.uid == uid;
}

// Admin-only Operations
match /weeks/{weekId} {
  allow read: if true;
  allow create, update, delete: if isAdmin();
}
```

---

## 🔌 **API Integration Framework**

### **API Client Pattern**

```javascript
// Generic API Client
class APIClient {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  async get(endpoint, params = {}) {
    const url = this.buildURL(endpoint, params);
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': this.apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  buildURL(endpoint, params) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    return url;
  }
}

// Usage
const footballAPI = new APIClient('https://v3.football.api-sports.io', API_KEY);
const fixtures = await footballAPI.get('/fixtures', { from: '2024-01-01', to: '2024-01-07' });
```

### **Error Handling Pattern**

```javascript
// Centralized Error Handler
class ErrorHandler {
  static handle(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // User-friendly error messages
    const userMessage = this.getUserMessage(error);
    
    // Show error in UI
    this.displayError(userMessage);
    
    // Log to monitoring service (if available)
    this.logError(error, context);
  }

  static getUserMessage(error) {
    if (error.code === 'permission-denied') {
      return 'Access denied. Please check your permissions.';
    } else if (error.code === 'unauthenticated') {
      return 'Please log in to continue.';
    } else if (error.message.includes('API error')) {
      return 'Unable to fetch data. Please try again later.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  static displayError(message) {
    // Update UI with error message
    const errorEl = document.getElementById('error-display');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }
}
```

---

## 🎨 **UI Framework**

### **Component Pattern**

```javascript
// Base Component Class
class Component {
  constructor(element, template) {
    this.element = element;
    this.template = template;
    this.state = {};
  }

  render() {
    this.element.innerHTML = this.template(this.state);
    this.bindEvents();
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  bindEvents() {
    // Override in subclasses
  }
}

// Match Card Component
class MatchCard extends Component {
  constructor(element, fixture) {
    super(element, this.getTemplate());
    this.fixture = fixture;
    this.state = { fixture, selected: null };
  }

  getTemplate() {
    return (state) => `
      <article class="match-card" data-fixture-id="${state.fixture.fixture.id}">
        <div class="match-header">
          <span class="league-name">${state.fixture.league.name}</span>
          <span class="match-time">${this.formatTime(state.fixture.fixture.date)}</span>
        </div>
        <div class="match-content">
          <div class="team home-team">
            <img src="${state.fixture.teams.home.logo}" alt="${state.fixture.teams.home.name}">
            <span>${state.fixture.teams.home.name}</span>
          </div>
          <div class="match-center">
            <span class="vs">VS</span>
          </div>
          <div class="team away-team">
            <img src="${state.fixture.teams.away.logo}" alt="${state.fixture.teams.away.name}">
            <span>${state.fixture.teams.away.name}</span>
          </div>
        </div>
        <div class="prediction-choices">
          <button class="prediction-btn home-btn ${state.selected === 'H' ? 'selected' : ''}" data-choice="H">Home</button>
          <button class="prediction-btn draw-btn ${state.selected === 'D' ? 'selected' : ''}" data-choice="D">Draw</button>
          <button class="prediction-btn away-btn ${state.selected === 'A' ? 'selected' : ''}" data-choice="A">Away</button>
        </div>
      </article>
    `;
  }

  bindEvents() {
    this.element.querySelectorAll('.prediction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const choice = e.target.dataset.choice;
        this.setState({ selected: choice });
        this.onPredictionChange(choice);
      });
    });
  }

  onPredictionChange(choice) {
    // Emit event or call callback
    this.element.dispatchEvent(new CustomEvent('predictionChange', {
      detail: { fixtureId: this.fixture.fixture.id, choice }
    }));
  }
}
```

### **CSS Architecture**

```css
/* Design Token System */
:root {
  /* Colors */
  --primary: #3b82f6;
  --primary-dark: #1e40af;
  --secondary: #64748b;
  --success: #16a34a;
  --error: #dc2626;
  --warning: #f59e0b;
  
  /* Typography */
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Layout */
  --container-max-width: 1100px;
  --border-radius: 14px;
  --shadow: 0 8px 24px rgba(16, 19, 23, 0.08);
}

/* Utility Classes */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }

/* Component Classes */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--ink);
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn.primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn.primary:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
}
```

---

## 🔄 **State Management Framework**

### **Event-Driven Architecture**

```javascript
// Event Bus Pattern
class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

// Global Event Bus
const eventBus = new EventBus();

// Usage Examples
eventBus.on('userAuthenticated', (user) => {
  updateUIForUser(user);
  loadUserPredictions(user.uid);
});

eventBus.on('predictionSubmitted', (data) => {
  updateLeaderboard();
  showSuccessMessage('Predictions saved!');
});

eventBus.on('matchFinished', (fixture) => {
  calculatePoints(fixture);
  updateRankings();
});
```

### **Reactive State Updates**

```javascript
// Observable State Pattern
class ObservableState {
  constructor(initialState = {}) {
    this.state = initialState;
    this.subscribers = new Map();
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(callback);
  }

  setState(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }

  getState(key) {
    return this.state[key];
  }

  notify(key, value) {
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(callback => callback(value));
    }
  }
}

// Application State
const appState = new ObservableState({
  user: null,
  currentWeek: null,
  fixtures: [],
  predictions: {},
  loading: false,
  error: null
});

// Subscribe to state changes
appState.subscribe('user', (user) => {
  if (user) {
    showAuthenticatedUI();
  } else {
    showAnonymousUI();
  }
});

appState.subscribe('fixtures', (fixtures) => {
  renderFixtures(fixtures);
});
```

---

## 🧪 **Testing Framework**

### **Unit Testing Pattern**

```javascript
// Test Suite Structure
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, testFunction) {
    this.tests.push({ description, testFunction });
  }

  async run() {
    console.log(`Running ${this.name}...`);
    
    for (const test of this.tests) {
      try {
        await test.testFunction();
        console.log(`✓ ${test.description}`);
        this.passed++;
      } catch (error) {
        console.error(`✗ ${test.description}: ${error.message}`);
        this.failed++;
      }
    }
    
    this.report();
  }

  report() {
    console.log(`\n${this.name} Results:`);
    console.log(`Passed: ${this.passed}, Failed: ${this.failed}`);
  }
}

// Example Test Suite
const authTests = new TestSuite('Authentication Tests');

authTests.test('User can sign up with valid email and password', async () => {
  const user = await signUp('test@example.com', 'password123');
  expect(user).toBeDefined();
  expect(user.email).toBe('test@example.com');
});

authTests.test('User cannot sign up with invalid email', async () => {
  try {
    await signUp('invalid-email', 'password123');
    throw new Error('Should have failed');
  } catch (error) {
    expect(error.code).toBe('auth/invalid-email');
  }
});

// Run tests
authTests.run();
```

---

## 🚀 **Performance Framework**

### **Optimization Patterns**

```javascript
// Debouncing Pattern
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttling Pattern
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// Lazy Loading Pattern
class LazyLoader {
  constructor() {
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      rootMargin: '50px'
    });
  }

  observe(element) {
    this.observer.observe(element);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        this.loadContent(element);
        this.observer.unobserve(element);
      }
    });
  }

  loadContent(element) {
    // Load content when element comes into view
    const dataSrc = element.dataset.src;
    if (dataSrc) {
      element.src = dataSrc;
      element.classList.remove('lazy');
    }
  }
}

// Usage
const lazyLoader = new LazyLoader();
document.querySelectorAll('img[data-src]').forEach(img => {
  lazyLoader.observe(img);
});
```

---

## 🔒 **Security Framework**

### **Input Validation Pattern**

```javascript
// Validation Utility
class Validator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password.length >= 8;
  }

  static sanitizeInput(input) {
    return input.replace(/[<>]/g, '');
  }

  static validateFixtureData(fixture) {
    const required = ['id', 'teams', 'league', 'date'];
    return required.every(field => fixture.hasOwnProperty(field));
  }
}

// Security Middleware
class SecurityMiddleware {
  static validateRequest(req) {
    // Validate authentication
    if (!req.auth) {
      throw new Error('Unauthorized');
    }

    // Validate input data
    if (req.body) {
      this.sanitizeRequestBody(req.body);
    }

    return true;
  }

  static sanitizeRequestBody(body) {
    Object.keys(body).forEach(key => {
      if (typeof body[key] === 'string') {
        body[key] = Validator.sanitizeInput(body[key]);
      }
    });
  }
}
```

---

## 📱 **Responsive Design Framework**

### **Breakpoint System**

```css
/* Mobile-first Breakpoints */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

/* Responsive Utilities */
@media (min-width: var(--breakpoint-sm)) {
  .sm\:hidden { display: none; }
  .sm\:block { display: block; }
  .sm\:flex { display: flex; }
}

@media (min-width: var(--breakpoint-md)) {
  .md\:hidden { display: none; }
  .md\:block { display: block; }
  .md\:flex { display: flex; }
}

/* Container Responsiveness */
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

@media (min-width: var(--breakpoint-sm)) {
  .container {
    max-width: 640px;
  }
}

@media (min-width: var(--breakpoint-md)) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: var(--breakpoint-lg)) {
  .container {
    max-width: 1024px;
  }
}

@media (min-width: var(--breakpoint-xl)) {
  .container {
    max-width: 1280px;
  }
}
```

---

## 🔄 **Deployment Framework**

### **Environment Configuration**

```javascript
// Environment Configuration
const environments = {
  development: {
    apiUrl: 'http://localhost:5001/your-project/us-central1/api',
    firebaseConfig: {
      // Development Firebase config
    }
  },
  staging: {
    apiUrl: 'https://staging-your-project.web.app/api',
    firebaseConfig: {
      // Staging Firebase config
    }
  },
  production: {
    apiUrl: 'https://your-project.web.app/api',
    firebaseConfig: {
      // Production Firebase config
    }
  }
};

// Get current environment
const getEnvironment = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('localhost')) return 'development';
  if (hostname.includes('staging')) return 'staging';
  return 'production';
};

// Export configuration
export const config = environments[getEnvironment()];
```

### **Build Process**

```json
{
  "scripts": {
    "dev": "firebase serve",
    "build": "npm run build:css && npm run build:js",
    "build:css": "postcss src/css/style.css -o public/style.css",
    "build:js": "esbuild src/js/app.js --bundle --outfile=public/js/app.js --minify",
    "deploy": "npm run build && firebase deploy",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:hosting": "firebase deploy --only hosting"
  }
}
```

---

## 📊 **Monitoring Framework**

### **Performance Monitoring**

```javascript
// Performance Metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.startTime = performance.now();
  }

  mark(name) {
    this.metrics[name] = performance.now();
  }

  measure(name, startMark, endMark) {
    const start = this.metrics[startMark];
    const end = this.metrics[endMark];
    
    if (start && end) {
      const duration = end - start;
      this.logMetric(name, duration);
      return duration;
    }
  }

  logMetric(name, value) {
    console.log(`Performance: ${name} = ${value.toFixed(2)}ms`);
    
    // Send to analytics service
    if (window.gtag) {
      gtag('event', 'performance', {
        event_category: 'timing',
        event_label: name,
        value: Math.round(value)
      });
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();
monitor.mark('appStart');

// Later in the code
monitor.mark('fixturesLoaded');
monitor.measure('fixturesLoadTime', 'appStart', 'fixturesLoaded');
```

---

## 🎯 **Best Practices Summary**

### **Code Organization**
- Use ES6 modules for clean separation of concerns
- Implement single responsibility principle
- Keep functions small and focused
- Use meaningful variable and function names

### **Performance**
- Implement lazy loading for non-critical resources
- Use debouncing for frequent operations
- Optimize DOM manipulations
- Implement efficient state management

### **Security**
- Validate all user inputs
- Implement proper authentication and authorization
- Use HTTPS in production
- Sanitize data before storage

### **Accessibility**
- Use semantic HTML elements
- Implement proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers

### **Testing**
- Write unit tests for critical functions
- Implement integration tests for user flows
- Use automated testing in CI/CD pipeline
- Test across different browsers and devices

---

This framework provides a solid foundation for building scalable, maintainable, and performant web applications. Follow these patterns and principles to ensure code quality and consistency across your project.
