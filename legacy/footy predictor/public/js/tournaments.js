/*
  Tournament Management Module — tournaments.js
  Handles creation, management, and participation in tournaments
*/

import { db, firestoreReady, currentUser } from './auth.js';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, serverTimestamp,
  query, where, orderBy, limit, onSnapshot, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class TournamentManager {
  constructor() {
    this.tournaments = [];
    this.currentTournament = null;
    this.gameWeeks = [];
    this.unsubs = [];
  }

  async createTournament(tournamentData) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!tournamentData.name || !tournamentData.leagueId) {
        throw new Error('Tournament name and league are required');
      }

      const tournamentRef = doc(collection(firestoreDb, 'tournaments'));
      const tournament = {
        id: tournamentRef.id,
        name: tournamentData.name,
        description: tournamentData.description || '',
        leagueId: tournamentData.leagueId,
        type: tournamentData.type || 'weekly',
        startDate: new Date(tournamentData.startDate).toISOString(),
        endDate: new Date(tournamentData.endDate).toISOString(),
        status: 'draft',
        createdBy: user.uid,
        creatorName: user.displayName || user.email,
        participants: [user.uid], // Creator is first participant
        participantNames: [user.displayName || user.email],
        isPublic: tournamentData.isPublic || false,
        entryFee: tournamentData.entryFee || 0,
        prizePool: tournamentData.prizePool || 0,
        rules: tournamentData.rules || {},
        maxParticipants: tournamentData.maxParticipants || 0,
        isUserCreated: true,
        template: tournamentData.template || null,
        scoringSystem: tournamentData.scoringSystem || 'standard',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(tournamentRef, tournament);
      console.log('Tournament created successfully:', tournament.id);
      
      // Add to local state
      this.tournaments.push(tournament);
      this.currentTournament = tournament;
      
      return tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  async joinTournament(tournamentId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tournamentRef = doc(firestoreDb, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }

      const tournament = tournamentDoc.data();
      
      // Check if tournament is open for joining
      if (tournament.status !== 'draft' && tournament.status !== 'active') {
        throw new Error('Tournament is not open for joining');
      }

      // Check if user is already a participant
      if (tournament.participants && tournament.participants.includes(user.uid)) {
        throw new Error('Already a participant in this tournament');
      }

      // Check if tournament is full
      if (tournament.maxParticipants > 0 && tournament.participants && tournament.participants.length >= tournament.maxParticipants) {
        throw new Error('Tournament is full');
      }

      // Add user to participants
      await updateDoc(tournamentRef, {
        participants: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      console.log('Joined tournament successfully:', tournamentId);
      
      // Refresh local state
      await this.getTournaments();
      
      return true;
    } catch (error) {
      console.error('Error joining tournament:', error);
      throw error;
    }
  }

  async leaveTournament(tournamentId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tournamentRef = doc(firestoreDb, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }

      const tournament = tournamentDoc.data();
      
      // Check if user is a participant
      if (!tournament.participants || !tournament.participants.includes(user.uid)) {
        throw new Error('Not a participant in this tournament');
      }

      // Check if user is the creator (prevent creator from leaving)
      if (tournament.createdBy === user.uid) {
        throw new Error('Tournament creator cannot leave');
      }

      // Remove user from participants
      await updateDoc(tournamentRef, {
        participants: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });

      console.log('Left tournament successfully:', tournamentId);
      
      // Refresh local state
      await this.getTournaments();
      
      return true;
    } catch (error) {
      console.error('Error leaving tournament:', error);
      throw error;
    }
  }

  async getTournaments(filters = {}) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      let q = collection(firestoreDb, 'tournaments');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.leagueId) {
        q = query(q, where('leagueId', '==', filters.leagueId));
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }

      // Order by creation date
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const tournaments = [];
      
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() });
      });

      this.tournaments = tournaments;
      return tournaments;
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw error;
    }
  }

  async getUserTournaments() {
    try {
      const user = currentUser();
      if (!user) {
        return [];
      }

      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const q = query(
        collection(firestoreDb, 'tournaments'),
        where('participants', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const userTournaments = [];
      
      querySnapshot.forEach((doc) => {
        userTournaments.push({ id: doc.id, ...doc.data() });
      });

      return userTournaments;
    } catch (error) {
      console.error('Error fetching user tournaments:', error);
      throw error;
    }
  }

  async getTournamentById(tournamentId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const tournamentRef = doc(firestoreDb, 'tournaments', tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }

      return { id: tournamentDoc.id, ...tournamentDoc.data() };
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }

  // Game Week Management
  async createGameWeek(tournamentId, gameWeekData) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is tournament creator or admin
      const tournament = await this.getTournamentById(tournamentId);
      if (tournament.createdBy !== user.uid) {
        throw new Error('Only tournament creator can create game weeks');
      }

      const gameWeekRef = doc(collection(firestoreDb, 'gameWeeks'));
      const gameWeek = {
        id: gameWeekRef.id,
        tournamentId: tournamentId,
        name: gameWeekData.name,
        startDate: new Date(gameWeekData.startDate).toISOString(),
        endDate: new Date(gameWeekData.endDate).toISOString(),
        status: 'draft',
        fixtures: gameWeekData.fixtures || [],
        maxFixtures: gameWeekData.maxFixtures || 0,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(gameWeekRef, gameWeek);
      console.log('Game week created successfully:', gameWeek.id);
      
      return gameWeek;
    } catch (error) {
      console.error('Error creating game week:', error);
      throw error;
    }
  }

  async getGameWeeks(tournamentId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const q = query(
        collection(firestoreDb, 'gameWeeks'),
        where('tournamentId', '==', tournamentId),
        orderBy('startDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const gameWeeks = [];
      
      querySnapshot.forEach((doc) => {
        gameWeeks.push({ id: doc.id, ...doc.data() });
      });

      this.gameWeeks = gameWeeks;
      return gameWeeks;
    } catch (error) {
      console.error('Error fetching game weeks:', error);
      throw error;
    }
  }

  async updateGameWeekStatus(gameWeekId, status) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const gameWeekRef = doc(firestoreDb, 'gameWeeks', gameWeekId);
      await updateDoc(gameWeekRef, {
        status: status,
        updatedAt: serverTimestamp()
      });

      console.log('Game week status updated:', gameWeekId, status);
      return true;
    } catch (error) {
      console.error('Error updating game week status:', error);
      throw error;
    }
  }

  // Tournament Status Management
  async updateTournamentStatus(tournamentId, status) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is tournament creator
      const tournament = await this.getTournamentById(tournamentId);
      if (tournament.createdBy !== user.uid) {
        throw new Error('Only tournament creator can update status');
      }

      const tournamentRef = doc(firestoreDb, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        status: status,
        updatedAt: serverTimestamp()
      });

      console.log('Tournament status updated:', tournamentId, status);
      
      // Refresh local state
      await this.getTournaments();
      
      return true;
    } catch (error) {
      console.error('Error updating tournament status:', error);
      throw error;
    }
  }

  // Tournament Leaderboard
  async getTournamentLeaderboard(tournamentId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      // Get tournament participants
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const participants = tournament.participants || [];
      const leaderboard = [];

      // For now, return basic participant list
      // In Phase 3, this will calculate actual scores
      for (const participantId of participants) {
        try {
          const userDoc = await getDoc(doc(firestoreDb, 'users', participantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            leaderboard.push({
              userId: participantId,
              displayName: userData.displayName || 'Unknown User',
              points: 0, // Will be calculated in Phase 3
              rank: 0
            });
          }
        } catch (error) {
          console.warn('Error fetching participant data:', error);
        }
      }

      // Sort by points (descending) and assign ranks
      leaderboard.sort((a, b) => b.points - a.points);
      leaderboard.forEach((participant, index) => {
        participant.rank = index + 1;
      });

      return leaderboard;
    } catch (error) {
      console.error('Error fetching tournament leaderboard:', error);
      throw error;
    }
  }

  // Watch tournaments for real-time updates
  watchTournaments(callback, filters = {}) {
    try {
      const firestoreDb = firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      let q = collection(firestoreDb, 'tournaments');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.leagueId) {
        q = query(q, where('leagueId', '==', filters.leagueId));
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tournaments = [];
        querySnapshot.forEach((doc) => {
          tournaments.push({ id: doc.id, ...doc.data() });
        });
        
        this.tournaments = tournaments;
        if (callback) callback(tournaments);
      });

      this.unsubs.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up tournaments watcher:', error);
      throw error;
    }
  }

  // Tournament Templates
  async getTournamentTemplates() {
    try {
      const templates = [
        {
          id: 'weekly-challenge',
          name: 'Weekly Challenge',
          description: 'Weekly tournament with fresh fixtures every week',
          type: 'weekly',
          duration: '7 days',
          maxParticipants: 50,
          scoringSystem: 'standard',
          rules: {
            pointsPerCorrect: 3,
            pointsPerClose: 1,
            bonusPoints: 0
          }
        },
        {
          id: 'monthly-championship',
          name: 'Monthly Championship',
          description: 'Monthly tournament with cumulative scoring',
          type: 'monthly',
          duration: '30 days',
          maxParticipants: 100,
          scoringSystem: 'cumulative',
          rules: {
            pointsPerCorrect: 3,
            pointsPerClose: 1,
            bonusPoints: 5,
            streakBonus: true
          }
        },
        {
          id: 'season-long',
          name: 'Season Long',
          description: 'Full season tournament with league table',
          type: 'season-long',
          duration: '9 months',
          maxParticipants: 200,
          scoringSystem: 'league',
          rules: {
            pointsPerCorrect: 3,
            pointsPerClose: 1,
            bonusPoints: 10,
            relegation: true,
            cupCompetitions: true
          }
        },
        {
          id: 'custom-tournament',
          name: 'Custom Tournament',
          description: 'Create your own tournament with custom rules',
          type: 'custom',
          duration: 'flexible',
          maxParticipants: 0,
          scoringSystem: 'custom',
          rules: {
            pointsPerCorrect: 3,
            pointsPerClose: 1,
            bonusPoints: 0,
            customRules: true
          }
        }
      ];

      return templates;
    } catch (error) {
      console.error('Error fetching tournament templates:', error);
      throw error;
    }
  }

  // Enhanced Scoring System
  async calculateTournamentScore(tournamentId, userId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      // Get tournament details
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Get user's predictions for tournament fixtures
      const predictionsQuery = query(
        collection(firestoreDb, 'predictions'),
        where('tournamentId', '==', tournamentId),
        where('userId', '==', userId)
      );

      const predictionsSnapshot = await getDocs(predictionsQuery);
      let totalScore = 0;
      let correctPredictions = 0;
      let closePredictions = 0;
      let totalPredictions = 0;
      let streakCount = 0;
      let maxStreak = 0;
      let bonusPoints = 0;

      // Phase 4: Enhanced scoring with streaks and bonuses
      const predictions = [];
      predictionsSnapshot.forEach((doc) => {
        const prediction = doc.data();
        if (prediction.score !== undefined) {
          predictions.push(prediction);
        }
      });

      // Sort predictions by date for streak calculation
      predictions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      predictions.forEach((prediction, index) => {
        if (prediction.score !== undefined) {
          totalScore += prediction.score;
          totalPredictions++;

          // Track correct and close predictions
          if (prediction.score >= 3) {
            correctPredictions++;
            streakCount++;
            maxStreak = Math.max(maxStreak, streakCount);
          } else if (prediction.score >= 1) {
            closePredictions++;
            streakCount = 0;
          } else {
            streakCount = 0;
          }

          // Phase 4: Bonus points for streaks and milestones
          if (streakCount === 3) bonusPoints += 5; // 3 in a row
          if (streakCount === 5) bonusPoints += 10; // 5 in a row
          if (streakCount === 10) bonusPoints += 25; // 10 in a row
        }
      });

      // Apply tournament-specific scoring rules
      const finalScore = this.applyTournamentScoringRules(
        totalScore, 
        bonusPoints, 
        tournament.scoringSystem,
        tournament.rules
      );

      return {
        totalScore: finalScore,
        baseScore: totalScore,
        bonusPoints: bonusPoints,
        correctPredictions,
        closePredictions,
        totalPredictions,
        maxStreak,
        accuracy: totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0
      };
    } catch (error) {
      console.error('Error calculating tournament score:', error);
      throw error;
    }
  }

  // Phase 4: Apply tournament-specific scoring rules
  applyTournamentScoringRules(baseScore, bonusPoints, scoringSystem, rules) {
    let finalScore = baseScore + bonusPoints;

    switch (scoringSystem) {
      case 'cumulative':
        // Cumulative scoring with streak bonuses
        if (rules.streakBonus) {
          finalScore += bonusPoints;
        }
        break;
      
      case 'league':
        // League-style scoring with relegation bonuses
        if (rules.relegation) {
          finalScore += Math.floor(baseScore / 100) * 10; // Bonus every 100 points
        }
        break;
      
      case 'custom':
        // Custom scoring based on rules
        if (rules.customRules) {
          finalScore = this.calculateCustomScore(baseScore, bonusPoints, rules);
        }
        break;
      
      default:
        // Standard scoring
        break;
    }

    return finalScore;
  }

  // Phase 4: Calculate custom scoring based on rules
  calculateCustomScore(baseScore, bonusPoints, rules) {
    let score = baseScore + bonusPoints;

    // Apply custom multipliers
    if (rules.scoreMultiplier) {
      score *= rules.scoreMultiplier;
    }

    // Apply custom bonuses
    if (rules.customBonuses) {
      rules.customBonuses.forEach(bonus => {
        if (baseScore >= bonus.threshold) {
          score += bonus.points;
        }
      });
    }

    return Math.round(score);
  }

  // Phase 4: Advanced Tournament Structure Management
  async createTournamentStructure(tournamentId, structureData) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is tournament creator
      const tournament = await this.getTournamentById(tournamentId);
      if (tournament.createdBy !== user.uid) {
        throw new Error('Only tournament creator can modify structure');
      }

      const structureRef = doc(collection(firestoreDb, 'tournamentStructures'), tournamentId);
      const structure = {
        tournamentId,
        type: structureData.type, // 'knockout', 'group', 'hybrid'
        stages: structureData.stages || [],
        groups: structureData.groups || [],
        knockoutRounds: structureData.knockoutRounds || [],
        seeding: structureData.seeding || 'random', // 'random', 'ranked', 'manual'
        tiebreakers: structureData.tiebreakers || ['goalDifference', 'goalsFor', 'headToHead'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(structureRef, structure);
      console.log('Tournament structure created successfully');
      
      return structure;
    } catch (error) {
      console.error('Error creating tournament structure:', error);
      throw error;
    }
  }

  // Phase 4: Create knockout tournament rounds
  async createKnockoutRounds(tournamentId, participants) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const rounds = [];
      let currentParticipants = [...participants];
      let roundNumber = 1;

      while (currentParticipants.length > 1) {
        const round = {
          roundNumber,
          name: this.getRoundName(roundNumber, currentParticipants.length),
          participants: currentParticipants,
          matches: this.generateMatches(currentParticipants),
          status: 'pending',
          createdAt: serverTimestamp()
        };

        rounds.push(round);
        
        // Prepare for next round (winners advance)
        currentParticipants = new Array(Math.ceil(currentParticipants.length / 2)).fill(null);
        roundNumber++;
      }

      // Save rounds to Firestore
      const roundsRef = collection(firestoreDb, 'tournamentRounds');
      for (const round of rounds) {
        const roundRef = doc(roundsRef);
        await setDoc(roundRef, { ...round, id: roundRef.id, tournamentId });
      }

      return rounds;
    } catch (error) {
      console.error('Error creating knockout rounds:', error);
      throw error;
    }
  }

  // Phase 4: Generate group stage structure
  async createGroupStages(tournamentId, participants, groupCount = 4) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      // Shuffle participants for random seeding
      const shuffledParticipants = this.shuffleArray([...participants]);
      
      const groups = [];
      const participantsPerGroup = Math.ceil(participants.length / groupCount);

      for (let i = 0; i < groupCount; i++) {
        const groupParticipants = shuffledParticipants.slice(
          i * participantsPerGroup, 
          (i + 1) * participantsPerGroup
        );

        const group = {
          groupId: `group-${String.fromCharCode(65 + i)}`, // A, B, C, D...
          name: `Group ${String.fromCharCode(65 + i)}`,
          participants: groupParticipants,
          matches: this.generateGroupMatches(groupParticipants),
          standings: this.initializeGroupStandings(groupParticipants),
          status: 'active',
          createdAt: serverTimestamp()
        };

        groups.push(group);
      }

      // Save groups to Firestore
      const groupsRef = collection(firestoreDb, 'tournamentGroups');
      for (const group of groups) {
        const groupRef = doc(groupsRef);
        await setDoc(groupRef, { ...group, id: groupRef.id, tournamentId });
      }

      return groups;
    } catch (error) {
      console.error('Error creating group stages:', error);
      throw error;
    }
  }

  // Phase 4: Helper functions for tournament structure
  getRoundName(roundNumber, participantCount) {
    if (participantCount === 2) return 'Final';
    if (participantCount === 4) return 'Semi-Finals';
    if (participantCount === 8) return 'Quarter-Finals';
    if (participantCount === 16) return 'Round of 16';
    if (participantCount === 32) return 'Round of 32';
    return `Round ${roundNumber}`;
  }

  generateMatches(participants) {
    const matches = [];
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        matches.push({
          homeTeam: participants[i],
          awayTeam: participants[i + 1],
          status: 'scheduled',
          homeScore: null,
          awayScore: null
        });
      }
    }
    return matches;
  }

  generateGroupMatches(participants) {
    const matches = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matches.push({
          homeTeam: participants[i],
          awayTeam: participants[j],
          status: 'scheduled',
          homeScore: null,
          awayScore: null
        });
      }
    }
    return matches;
  }

  initializeGroupStandings(participants) {
    return participants.map(participant => ({
      participantId: participant,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    }));
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Phase 4: Real-time notifications system
  async sendTournamentNotification(tournamentId, notificationData) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get tournament participants
      const tournament = await this.getTournamentById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Create notification for each participant
      const notifications = [];
      for (const participantId of tournament.participants) {
        const notificationRef = doc(collection(firestoreDb, 'notifications'));
        const notification = {
          id: notificationRef.id,
          userId: participantId,
          tournamentId,
          type: notificationData.type, // 'match_result', 'tournament_update', 'invitation'
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data || {},
          read: false,
          createdAt: serverTimestamp()
        };

        notifications.push(notification);
        await setDoc(notificationRef, notification);
      }

      console.log(`Notifications sent to ${notifications.length} participants`);
      return notifications;
    } catch (error) {
      console.error('Error sending tournament notifications:', error);
      throw error;
    }
  }

  // Phase 4: Get user notifications
  async getUserNotifications(userId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const q = query(
        collection(firestoreDb, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const notifications = [];
      
      querySnapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Phase 4: Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const notificationRef = doc(firestoreDb, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });

      console.log('Notification marked as read');
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Tournament Sharing
  async shareTournament(tournamentId, shareData) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is tournament creator
      const tournament = await this.getTournamentById(tournamentId);
      if (tournament.createdBy !== user.uid) {
        throw new Error('Only tournament creator can share');
      }

      // Create share document
      const shareRef = doc(collection(firestoreDb, 'tournamentShares'));
      const share = {
        id: shareRef.id,
        tournamentId: tournamentId,
        tournamentName: tournament.name,
        sharedBy: user.uid,
        sharedByName: user.displayName || user.email,
        shareType: shareData.type || 'public', // public, private, invite-only
        shareCode: shareData.code || this.generateShareCode(),
        expiresAt: shareData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        createdAt: serverTimestamp()
      };

      await setDoc(shareRef, share);
      console.log('Tournament shared successfully');
      
      return share;
    } catch (error) {
      console.error('Error sharing tournament:', error);
      throw error;
    }
  }

  generateShareCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Cleanup subscriptions
  cleanup() {
    this.unsubs.forEach(unsub => unsub && unsub());
    this.unsubs = [];
  }
}

// Export singleton instance
export const tournamentManager = new TournamentManager();

// Helper functions for common tournament operations
export async function createTournament(tournamentData) {
  return tournamentManager.createTournament(tournamentData);
}

export async function joinTournament(tournamentId) {
  return tournamentManager.joinTournament(tournamentId);
}

export async function leaveTournament(tournamentId) {
  return tournamentManager.leaveTournament(tournamentId);
}

export async function getTournaments(filters) {
  return tournamentManager.getTournaments(filters);
}

export async function getUserTournaments() {
  return tournamentManager.getUserTournaments();
}

export async function getTournamentById(tournamentId) {
  return tournamentManager.getTournamentById(tournamentId);
}

export async function createGameWeek(tournamentId, gameWeekData) {
  return tournamentManager.createGameWeek(tournamentId, gameWeekData);
}

export async function getGameWeeks(tournamentId) {
  return tournamentManager.getGameWeeks(tournamentId);
}

export async function updateGameWeekStatus(gameWeekId, status) {
  return tournamentManager.updateGameWeekStatus(gameWeekId, status);
}

export async function updateTournamentStatus(tournamentId, status) {
  return tournamentManager.updateTournamentStatus(tournamentId, status);
}

export async function getTournamentLeaderboard(tournamentId) {
  return tournamentManager.getTournamentLeaderboard(tournamentId);
}

// Export new Phase 3 functions
export async function getTournamentTemplates() {
  return tournamentManager.getTournamentTemplates();
}

export async function calculateTournamentScore(tournamentId, userId) {
  return tournamentManager.calculateTournamentScore(tournamentId, userId);
}

export async function shareTournament(tournamentId, shareData) {
  return tournamentManager.shareTournament(tournamentId, shareData);
}

// Export new Phase 4 functions
export async function createTournamentStructure(tournamentId, structureData) {
  return tournamentManager.createTournamentStructure(tournamentId, structureData);
}

export async function createKnockoutRounds(tournamentId, participants) {
  return tournamentManager.createKnockoutRounds(tournamentId, participants);
}

export async function createGroupStages(tournamentId, participants, groupCount) {
  return tournamentManager.createGroupStages(tournamentId, participants, groupCount);
}

export async function sendTournamentNotification(tournamentId, notificationData) {
  return tournamentManager.sendTournamentNotification(tournamentId, notificationData);
}

export async function getUserNotifications(userId) {
  return tournamentManager.getUserNotifications(userId);
}

export async function markNotificationAsRead(notificationId) {
  return tournamentManager.markNotificationAsRead(notificationId);
}
