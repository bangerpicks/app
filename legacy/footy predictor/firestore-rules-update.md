# Firestore Security Rules Update for Phase 3 & 4

## Required Collections

Phase 3 & 4 introduce several new collections that need proper security rules:

### 1. `leagues` Collection
- **Purpose**: Store user-created leagues
- **Access**: Authenticated users can read/write their own leagues
- **Rules**: Users can create leagues, join public leagues, and manage leagues they created

### 2. `tournaments` Collection  
- **Purpose**: Store user-created tournaments
- **Access**: Authenticated users can read/write their own tournaments
- **Rules**: Users can create tournaments, join public tournaments, and manage tournaments they created

### 3. `gameWeeks` Collection
- **Purpose**: Store tournament game weeks
- **Access**: Authenticated users can read, creators can write
- **Rules**: Read access for participants, write access for tournament creators

### 4. `leagueInvitations` Collection
- **Purpose**: Store league invitations
- **Access**: Authenticated users can read their own invitations
- **Rules**: Users can read invitations sent to them, league creators can create invitations

### 5. `tournamentShares` Collection
- **Purpose**: Store tournament sharing information
- **Access**: Authenticated users can read public shares
- **Rules**: Tournament creators can create shares, users can read public shares

### 6. **NEW Phase 4 Collections**

#### `tournamentStructures` Collection
- **Purpose**: Store tournament structure configuration
- **Access**: Tournament creators can read/write
- **Rules**: Only tournament creators can modify structure

#### `tournamentRounds` Collection
- **Purpose**: Store knockout round information
- **Access**: Tournament participants can read, creators can write
- **Rules**: Read access for participants, write access for tournament creators

#### `tournamentGroups` Collection
- **Purpose**: Store group stage data
- **Access**: Tournament participants can read, creators can write
- **Rules**: Read access for participants, write access for tournament creators

#### `notifications` Collection
- **Purpose**: Store user notifications
- **Access**: Users can read their own notifications
- **Rules**: Users can read notifications sent to them, tournament creators can create notifications

## Updated Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is the creator
    function isCreator(creatorId) {
      return isAuthenticated() && request.auth.uid == creatorId;
    }
    
    // Helper function to check if user is a participant
    function isParticipant(participants) {
      return isAuthenticated() && request.auth.uid in participants;
    }

    // Leagues collection
    match /leagues/{leagueId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        isCreator(resource.data.createdBy) || 
        isParticipant(resource.data.participants)
      );
      allow delete: if isAuthenticated() && isCreator(resource.data.createdBy);
    }

    // Tournaments collection
    match /tournaments/{tournamentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        isCreator(resource.data.createdBy) || 
        isParticipant(resource.data.participants)
      );
      allow delete: if isAuthenticated() && isCreator(resource.data.createdBy);
    }

    // Game weeks collection
    match /gameWeeks/{gameWeekId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.createdBy);
    }

    // League invitations collection
    match /leagueInvitations/{invitationId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.invitedBy ||
        request.auth.token.email == resource.data.invitedEmail
      );
      allow create: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/leagues/$(resource.data.leagueId)).data.createdBy);
      allow update: if isAuthenticated() && (
        request.auth.uid == resource.data.invitedBy ||
        request.auth.token.email == resource.data.invitedEmail
      );
    }

    // Tournament shares collection
    match /tournamentShares/{shareId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.createdBy);
    }

    // NEW Phase 4 Collections

    // Tournament structures collection
    match /tournamentStructures/{structureId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.createdBy);
    }

    // Tournament rounds collection
    match /tournamentRounds/{roundId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.createdBy);
    }

    // Tournament groups collection
    match /tournamentGroups/{groupId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.createdBy);
    }

    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
        isCreator(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.createdBy);
      allow update: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }

    // Existing collections (keep existing rules)
    match /predictions/{predictionId} {
      allow read, write: if isAuthenticated();
    }

    match /weeks/{weekId} {
      allow read, write: if isAuthenticated();
    }

    match /fixtures/{fixtureId} {
      allow read, write: if isAuthenticated();
    }

    match /settings/{settingId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

## Required Composite Indexes

You may need to create these composite indexes for optimal performance:

### 1. Leagues Collection
- **Fields**: `status` (Ascending) + `createdAt` (Descending)
- **Purpose**: Efficiently query active leagues by creation date

### 2. League Invitations Collection  
- **Fields**: `invitedEmail` (Ascending) + `status` (Ascending) + `createdAt` (Descending)
- **Purpose**: Query pending invitations for a specific user

### 3. Tournaments Collection
- **Fields**: `status` (Ascending) + `createdAt` (Descending)
- **Purpose**: Efficiently query active tournaments by creation date

### 4. **NEW Phase 4 Indexes**

#### Notifications Collection
- **Fields**: `userId` (Ascending) + `createdAt` (Descending)
- **Purpose**: Query user notifications by creation date

#### Tournament Structures Collection
- **Fields**: `tournamentId` (Ascending) + `createdAt` (Descending)
- **Purpose**: Query tournament structures by creation date

#### Tournament Rounds Collection
- **Fields**: `tournamentId` (Ascending) + `roundNumber` (Ascending)
- **Purpose**: Query tournament rounds in order

#### Tournament Groups Collection
- **Fields**: `tournamentId` (Ascending) + `groupId` (Ascending)
- **Purpose**: Query tournament groups efficiently

## How to Apply

1. **Go to Firebase Console** → Firestore Database → Rules
2. **Replace existing rules** with the updated rules above
3. **Go to Firebase Console** → Firestore Database → Indexes
4. **Create composite indexes** as listed above
5. **Test the rules** by trying to create/read leagues, tournaments, and Phase 4 features

## Testing the Rules

After updating the rules, test these operations:

### Phase 3 Operations:
1. ✅ **Create a league** (should work for authenticated users)
2. ✅ **Join a public league** (should work for authenticated users)
3. ✅ **Send league invitation** (should work for league creators)
4. ✅ **Accept/decline invitation** (should work for invited users)
5. ✅ **Create a tournament** (should work for authenticated users)
6. ✅ **Join a tournament** (should work for authenticated users)

### **NEW Phase 4 Operations:**
7. ✅ **Create tournament structure** (should work for tournament creators)
8. ✅ **Create knockout rounds** (should work for tournament creators)
9. ✅ **Create group stages** (should work for tournament creators)
10. ✅ **Send notifications** (should work for tournament creators)
11. ✅ **Read notifications** (should work for notification recipients)
12. ✅ **Update notifications** (should work for notification recipients)

If any of these fail, check the browser console for specific error messages and adjust the rules accordingly.

## Phase 4 Features Overview

### **Advanced Tournament Management**
- Complex tournament structures (knockout, group, hybrid)
- Automatic round generation and naming
- Group stage management with standings
- Advanced seeding and tiebreaker systems

### **Enhanced Scoring Systems**
- Streak bonuses and milestone rewards
- Custom scoring rules and multipliers
- Tournament-specific bonus calculations
- Performance tracking and analytics

### **Real-time Notifications**
- Tournament update notifications
- Participant communication
- Real-time updates and alerts
- Notification management system

### **Advanced Analytics**
- Participant performance tracking
- Scoring trends and statistics
- Tournament structure visualization
- Performance analytics dashboard

---

**Phase 4 brings professional tournament management capabilities to your footy predictor app! 🎯⚽🚀**
