/*
  League Management Module — leagues.js
  Handles creation, joining, and management of leagues
*/

import { db, firestoreReady, currentUser } from './auth.js';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, serverTimestamp,
  query, where, orderBy, limit, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

class LeagueManager {
  constructor() {
    this.leagues = [];
    this.currentLeague = null;
    this.unsubs = [];
  }

  async createLeague(leagueData) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const leagueRef = doc(collection(firestoreDb, 'leagues'));
      const league = {
        id: leagueRef.id,
        name: leagueData.name,
        country: leagueData.country,
        type: leagueData.type || 'domestic',
        logo: leagueData.logo || '',
        season: leagueData.season || '2024/25',
        status: 'active',
        createdBy: user.uid,
        creatorName: user.displayName || user.email,
        isPublic: leagueData.isPublic || false,
        maxParticipants: leagueData.maxParticipants || 0,
        participants: [user.uid], // Creator is first participant
        participantNames: [user.displayName || user.email],
        description: leagueData.description || '',
        rules: leagueData.rules || {},
        isUserCreated: true,
        apiFootballId: leagueData.apiFootballId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(leagueRef, league);
      console.log('League created successfully:', league.id);
      
      // Add to local state
      this.leagues.push(league);
      this.currentLeague = league;
      
      return league;
    } catch (error) {
      console.error('Error creating league:', error);
      throw error;
    }
  }

  async joinLeague(leagueId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const leagueRef = doc(firestoreDb, 'leagues', leagueId);
      const leagueDoc = await getDoc(leagueRef);
      
      if (!leagueDoc.exists()) {
        throw new Error('League not found');
      }

      const league = leagueDoc.data();
      
      // Check if user is already a participant
      if (league.participants && league.participants.includes(user.uid)) {
        throw new Error('Already a participant in this league');
      }

      // Check if league is full
      if (league.maxParticipants > 0 && league.participants && league.participants.length >= league.maxParticipants) {
        throw new Error('League is full');
      }

      // Add user to participants
      const updatedParticipants = [...(league.participants || []), user.uid];
      await updateDoc(leagueRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });

      // Update local state
      const updatedLeague = { ...league, participants: updatedParticipants };
      const index = this.leagues.findIndex(l => l.id === leagueId);
      if (index !== -1) {
        this.leagues[index] = updatedLeague;
      }

      console.log('Joined league successfully:', leagueId);
      return updatedLeague;
    } catch (error) {
      console.error('Error joining league:', error);
      throw error;
    }
  }

  async getLeagues(filters = {}) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      let q = collection(firestoreDb, 'leagues');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.country) {
        q = query(q, where('country', '==', filters.country));
      }
      if (filters.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }

      // Order by creation date
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const leagues = [];
      
      querySnapshot.forEach((doc) => {
        leagues.push({ id: doc.id, ...doc.data() });
      });

      this.leagues = leagues;
      return leagues;
    } catch (error) {
      console.error('Error fetching leagues:', error);
      throw error;
    }
  }

  async getLeagueById(leagueId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const leagueRef = doc(firestoreDb, 'leagues', leagueId);
      const leagueDoc = await getDoc(leagueRef);
      
      if (!leagueDoc.exists()) {
        throw new Error('League not found');
      }

      return { id: leagueDoc.id, ...leagueDoc.data() };
    } catch (error) {
      console.error('Error fetching league:', error);
      throw error;
    }
  }

  async getUserLeagues() {
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
        collection(firestoreDb, 'leagues'),
        where('participants', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const userLeagues = [];
      
      querySnapshot.forEach((doc) => {
        userLeagues.push({ id: doc.id, ...doc.data() });
      });

      return userLeagues;
    } catch (error) {
      console.error('Error fetching user leagues:', error);
      throw error;
    }
  }

  setCurrentLeague(league) {
    this.currentLeague = league;
    // Store in localStorage for persistence
    if (league) {
      localStorage.setItem('currentLeagueId', league.id);
    } else {
      localStorage.removeItem('currentLeagueId');
    }
  }

  getCurrentLeague() {
    return this.currentLeague;
  }

  async loadCurrentLeague() {
    const leagueId = localStorage.getItem('currentLeagueId');
    if (leagueId) {
      try {
        const league = await this.getLeagueById(leagueId);
        this.currentLeague = league;
        return league;
      } catch (error) {
        console.error('Error loading current league:', error);
        localStorage.removeItem('currentLeagueId');
        this.currentLeague = null;
      }
    }
    return null;
  }

  // Watch leagues for real-time updates
  watchLeagues(callback, filters = {}) {
    try {
      const firestoreDb = firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      let q = collection(firestoreDb, 'leagues');
      
      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.country) {
        q = query(q, where('country', '==', filters.country));
      }
      if (filters.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const leagues = [];
        querySnapshot.forEach((doc) => {
          leagues.push({ id: doc.id, ...doc.data() });
        });
        
        this.leagues = leagues;
        if (callback) callback(leagues);
      });

      this.unsubs.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up leagues watcher:', error);
      throw error;
    }
  }

  // League Invitation System
  async inviteUserToLeague(leagueId, email) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is league creator or admin
      const league = await this.getLeagueById(leagueId);
      if (league.createdBy !== user.uid) {
        throw new Error('Only league creator can send invitations');
      }

      // Create invitation document
      const invitationRef = doc(collection(firestoreDb, 'leagueInvitations'));
      const invitation = {
        id: invitationRef.id,
        leagueId: leagueId,
        leagueName: league.name,
        invitedEmail: email,
        invitedBy: user.uid,
        invitedByName: user.displayName || user.email,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        createdAt: serverTimestamp()
      };

      await setDoc(invitationRef, invitation);
      console.log('League invitation sent successfully');
      
      return invitation;
    } catch (error) {
      console.error('Error sending league invitation:', error);
      throw error;
    }
  }

  async getLeagueInvitations() {
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
        collection(firestoreDb, 'leagueInvitations'),
        where('invitedEmail', '==', user.email),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const invitations = [];
      
      querySnapshot.forEach((doc) => {
        invitations.push({ id: doc.id, ...doc.data() });
      });

      return invitations;
    } catch (error) {
      console.error('Error fetching league invitations:', error);
      throw error;
    }
  }

  async acceptLeagueInvitation(invitationId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const user = currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get invitation
      const invitationRef = doc(firestoreDb, 'leagueInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationDoc.data();
      
      // Check if invitation is still valid
      if (invitation.status !== 'pending') {
        throw new Error('Invitation has already been processed');
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Join the league
      await this.joinLeague(invitation.leagueId);
      
      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      console.log('League invitation accepted successfully');
      return true;
    } catch (error) {
      console.error('Error accepting league invitation:', error);
      throw error;
    }
  }

  async declineLeagueInvitation(invitationId) {
    try {
      const firestoreDb = await firestoreReady;
      if (!firestoreDb) {
        throw new Error('Database not available');
      }

      const invitationRef = doc(firestoreDb, 'leagueInvitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'declined',
        declinedAt: serverTimestamp()
      });

      console.log('League invitation declined successfully');
      return true;
    } catch (error) {
      console.error('Error declining league invitation:', error);
      throw error;
    }
  }

  // League Templates
  async getLeagueTemplates() {
    try {
      const templates = [
        {
          id: 'premier-league-style',
          name: 'Premier League Style',
          description: 'Classic English Premier League format with 20 teams',
          type: 'domestic',
          maxParticipants: 20,
          rules: {
            scoring: 'standard',
            relegation: true,
            cupCompetitions: true
          }
        },
        {
          id: 'champions-league-style',
          name: 'Champions League Style',
          description: 'European competition format with group stages and knockout',
          type: 'continental',
          maxParticipants: 32,
          rules: {
            scoring: 'standard',
            groupStages: true,
            knockoutRounds: true
          }
        },
        {
          id: 'world-cup-style',
          name: 'World Cup Style',
          description: 'International tournament format with groups and elimination',
          type: 'international',
          maxParticipants: 64,
          rules: {
            scoring: 'standard',
            groupStages: true,
            knockoutRounds: true
          }
        }
      ];

      return templates;
    } catch (error) {
      console.error('Error fetching league templates:', error);
      throw error;
    }
  }

  // Cleanup subscriptions
  cleanup() {
    this.unsubs.forEach(unsub => unsub && unsub());
    this.unsubs = [];
  }
}

// Export singleton instance
export const leagueManager = new LeagueManager();

// Helper functions for common league operations
export async function createLeague(leagueData) {
  return leagueManager.createLeague(leagueData);
}

export async function joinLeague(leagueId) {
  return leagueManager.joinLeague(leagueId);
}

export async function getLeagues(filters) {
  return leagueManager.getLeagues(filters);
}

export async function getUserLeagues() {
  return leagueManager.getUserLeagues();
}

export function setCurrentLeague(league) {
  leagueManager.setCurrentLeague(league);
}

export function getCurrentLeague() {
  return leagueManager.getCurrentLeague();
}

export async function loadCurrentLeague() {
  return leagueManager.loadCurrentLeague();
}

// Export new Phase 3 functions
export async function inviteUserToLeague(leagueId, email) {
  return leagueManager.inviteUserToLeague(leagueId, email);
}

export async function getLeagueInvitations() {
  return leagueManager.getLeagueInvitations();
}

export async function acceptLeagueInvitation(invitationId) {
  return leagueManager.acceptLeagueInvitation(invitationId);
}

export async function declineLeagueInvitation(invitationId) {
  return leagueManager.declineLeagueInvitation(invitationId);
}

export async function getLeagueTemplates() {
  return leagueManager.getLeagueTemplates();
}
