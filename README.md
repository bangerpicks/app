# ⚽ Banger Picks

A modern football (soccer) match prediction web application built with Next.js, TypeScript, and Firebase. Predict match outcomes, compete on leaderboards, and redeem points in the shop!

## 🚀 Features

- **Weekly Gameweeks**: 10 carefully selected matches from world football every week
- **Match Predictions**: Predict Home Win (H), Draw (D), or Away Win (A) for each match
- **Real-time Scoring**: Automatic point calculation when matches finish
- **Leaderboards**: 
  - All-time leaderboard showing cumulative points
  - Weekly leaderboards for each gameweek
- **User Profiles**: Customizable profiles with favorite teams and statistics
- **Shop System**: Redeem points for digital and physical items
- **Admin Dashboard**: Manage gameweeks, fixtures, and monitor the platform
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **Real-time Updates**: Live leaderboard updates and match results

## 🏗️ Tech Stack

### Frontend
- **Next.js 14+** (App Router) - React framework with SSR/SSG
- **TypeScript** - Type-safe development
- **React 18+** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Shadcn/ui** - High-quality component library
- **Framer Motion** - Smooth animations
- **React Query (TanStack Query)** - Data fetching and caching
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation

### Backend & Infrastructure
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - NoSQL database
- **Firebase Storage** - Image/file storage
- **Firebase Hosting** - Static site hosting
- **Cloud Functions** - Serverless functions for auto-scoring and API proxying

### APIs & Data
- **api-football.com** - Match data, fixtures, results, team information

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Firebase CLI** (`npm install -g firebase-tools`)
- **API-Football account** and API key ([sign up here](https://www.api-football.com/))
- **Firebase project** ([create one here](https://console.firebase.google.com/))
- Modern web browser with ES6+ support

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "Banger Picks"
```

### 2. Install dependencies

```bash
npm install
```

> **💡 Working across multiple devices?** See [MULTI-DEVICE-SETUP.md](./MULTI-DEVICE-SETUP.md) for a complete guide on setting up the project on desktop and laptop without file system conflicts.

### 3. Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already initialized)
firebase init

# Select the following:
# - Firestore
# - Functions
# - Hosting
# - Storage
```

### 4. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# API-Football Configuration
NEXT_PUBLIC_API_FOOTBALL_KEY=your-api-football-key
API_FOOTBALL_KEY=your-api-football-key  # For Cloud Functions

# Environment
NEXT_PUBLIC_APP_ENV=development
```

### 5. Firebase Configuration

Update Firebase security rules and indexes as needed (see `docs/deployment.md` for details).

### 6. Set up Firebase Cloud Functions

```bash
cd functions
npm install
cd ..
```

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🚀 Quick Start

1. **Sign Up/Login**: Create an account or sign in
2. **View Current Gameweek**: See the 10 matches for the current week
3. **Make Predictions**: Select Home Win (H), Draw (D), or Away Win (A) for each match
4. **Submit Predictions**: Save your picks before the deadline
5. **Track Your Progress**: Check the leaderboards to see your ranking
6. **Redeem Points**: Visit the shop to spend your earned points

## 📁 Project Structure

```
banger-picks/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Authentication routes
│   │   ├── (dashboard)/   # Protected user routes
│   │   ├── admin/         # Admin routes
│   │   └── api/           # API routes
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   ├── predictions/  # Prediction components
│   │   ├── leaderboard/  # Leaderboard components
│   │   ├── shop/         # Shop components
│   │   └── admin/        # Admin components
│   ├── lib/              # Utilities and configurations
│   │   ├── firebase/     # Firebase utilities
│   │   └── api-football/ # API-Football client
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── store/            # State management
├── functions/            # Firebase Cloud Functions
├── docs/                 # Documentation
├── public/               # Static assets
└── README.md
```

For detailed project structure, see [docs/architecture.md](docs/architecture.md).

## 🔧 Configuration

### Firebase Configuration

Firebase configuration is managed through environment variables (see `.env.example`). The Firebase project settings are configured in the Firebase Console.

### API-Football Configuration

1. Sign up at [api-football.com](https://www.api-football.com/)
2. Get your API key from the dashboard
3. Add it to `.env.local` as `NEXT_PUBLIC_API_FOOTBALL_KEY`
4. For Cloud Functions, also add it as `API_FOOTBALL_KEY`

### Brand Colors

The app uses the following brand colors (from `brand-info/colors.txt`):

- **Primary**: `#daff00` (lime-yellow) - wins
- **Secondary**: `#240830` (midnight-violet)
- **Tertiary**: `#fdfff0` (ivory)
- **Quaternary**: `#ff9b00` (amber-glow) - draws
- **Quinary**: `#ee4136` (cinnabar) - losses

These are integrated into the Tailwind configuration.

## 📚 Documentation

- [Architecture Guide](docs/architecture.md) - System architecture and data flows
- [Database Schema](docs/database-schema.md) - Firestore collections and data models
- [API Reference](docs/api-reference.md) - API-Football integration and Cloud Functions
- [Deployment Guide](docs/deployment.md) - Firebase setup and deployment instructions
- [Figma MCP Integration](docs/figma-mcp-integration.md) - Using Figma with MCP for design-to-code workflow

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Firebase Emulators

To run Firebase emulators locally:

```bash
firebase emulators:start
```

This starts:
- Firestore emulator
- Authentication emulator
- Functions emulator
- Storage emulator

## 🚀 Deployment

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions.

### Quick Deploy

```bash
# Build the Next.js app
npm run build

# Deploy to Firebase
firebase deploy
```

This deploys:
- Next.js app to Firebase Hosting
- Cloud Functions
- Firestore security rules
- Storage rules

## 🔒 Security

- **Authentication**: Firebase Authentication with email/password and social providers
- **Authorization**: Role-based access control (admin vs regular users)
- **Data Protection**: Firestore security rules
- **API Security**: Secure API key storage and domain restrictions

For security rules details, see [docs/database-schema.md](docs/database-schema.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [docs/contributing.md](docs/contributing.md) for detailed contribution guidelines.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🙏 Acknowledgments

- **API-Football** for comprehensive football data
- **Firebase** for robust backend infrastructure
- **Next.js** team for the amazing framework
- **Lucide** for beautiful icons

---

**Built with ❤️ for football fans everywhere**
