/* Simplified Admin Dashboard - admin.js */

import { db, auth, isFirestoreReady, firestoreReady, onAuthStateChanged } from './auth.js';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc, addDoc, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { af } from './api-football.js';

// Core elements
const weeksListEl = document.getElementById('weeks-list');
const weeksLoadingEl = document.getElementById('weeks-loading');
const weeksEmptyEl = document.getElementById('weeks-empty');
const currentWeekDisplayEl = document.getElementById('current-week-display');
const btnAddWeek = document.getElementById('btn-add-week');
const btnRefreshWeeks = document.getElementById('btn-refresh-weeks');
const btnSetCurrent = document.getElementById('btn-set-current');

// Mobile menu elements
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const adminSidebar = document.querySelector('.admin-sidebar');
const mobileBackdrop = document.getElementById('mobile-backdrop');
const sidebarClose = document.getElementById('sidebar-close');

// Mobile menu functionality
function toggleMobileMenu() {
  const isOpen = adminSidebar.classList.contains('open');
  
  if (isOpen) {
    // Close menu
    closeMobileMenu();
  } else {
    // Open menu
    openMobileMenu();
  }
}

function openMobileMenu() {
  adminSidebar.classList.add('open');
  mobileBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Update ARIA attributes
  adminSidebar.setAttribute('aria-hidden', 'false');
  mobileMenuToggle.setAttribute('aria-expanded', 'true');
  
  // Focus the close button for accessibility
  if (sidebarClose) {
    sidebarClose.focus();
  }
}

function closeMobileMenu() {
  adminSidebar.classList.remove('open');
  mobileBackdrop.classList.remove('active');
  document.body.style.overflow = '';
  
  // Update ARIA attributes
  adminSidebar.setAttribute('aria-hidden', 'true');
  mobileMenuToggle.setAttribute('aria-expanded', 'false');
  
  // Return focus to the toggle button
  if (mobileMenuToggle) {
    mobileMenuToggle.focus();
  }
}

// Event listeners for mobile menu
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', toggleMobileMenu);
}

if (mobileBackdrop) {
  mobileBackdrop.addEventListener('click', closeMobileMenu);
}

if (sidebarClose) {
  sidebarClose.addEventListener('click', closeMobileMenu);
}

// Close mobile menu when clicking on nav items
document.addEventListener('click', (e) => {
  if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
    closeMobileMenu();
  }
});

// Close mobile menu on window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

// Close mobile menu on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && adminSidebar.classList.contains('open')) {
    closeMobileMenu();
  }
});

// Modal elements
const weekFormModal = document.getElementById('modal-week-form');
const weekForm = document.getElementById('week-form');
const weekFormTitle = document.getElementById('week-form-title');
const weekFormHelper = document.getElementById('week-form-helper');
const weekNameInput = document.getElementById('week-name');
const weekFromDateInput = document.getElementById('week-from-date');
const weekToDateInput = document.getElementById('week-to-date');
const weekStatusInput = document.getElementById('week-status');
const weekDescriptionInput = document.getElementById('week-description');

const deleteConfirmModal = document.getElementById('modal-delete-confirm');
const deleteWeekNameEl = document.getElementById('delete-week-name');
const weekSelectModal = document.getElementById('modal-week-select');
const weekSelectionListEl = document.getElementById('week-selection-list');

// Fixture management elements (simplified)
const adminForm = document.getElementById('admin-form');
const fromDateInput = document.getElementById('from-date');
const toDateInput = document.getElementById('to-date');
const countrySelect = document.getElementById('country-select');
const leagueSelect = document.getElementById('league-select');
const fixturesListEl = document.getElementById('fixtures-list');
const selectedListEl = document.getElementById('selected-list');
const selectedCountDisplayEl = document.getElementById('selected-count-display');
const saveBtn = document.getElementById('btn-save');
const adminStatusEl = document.getElementById('admin-status');
const btnLoadExisting = document.getElementById('btn-load-existing');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnRefreshLeagues = document.getElementById('btn-refresh-leagues');
const btnSyncWeeklySelections = document.getElementById('btn-sync-weekly-selections');
const fixturesWeekDisplayEl = document.getElementById('fixtures-week-display');
const btnChangeWeek = document.getElementById('btn-change-week');

// State
let currentEditingWeekId = null;
let currentFixtures = [];
let selectedFixtures = new Set();
let weeks = [];
let currentWeekId = null;

// Check admin status and display info
async function checkAndDisplayAdminStatus() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const firestoreDb = await firestoreReady;
    const userDoc = await getDoc(doc(firestoreDb, 'users', user.uid));
    const settingsDoc = await getDoc(doc(firestoreDb, 'settings', 'app'));
    
    let adminStatus = 'Unknown';
    let adminMethod = 'None';
    
    if (userDoc.exists() && userDoc.data().isAdmin) {
      adminStatus = 'Confirmed Admin';
      adminMethod = 'User document flag';
    } else if (settingsDoc.exists() && settingsDoc.data().adminUids && 
               settingsDoc.data().adminUids.includes(user.uid)) {
      adminStatus = 'Confirmed Admin';
      adminMethod = 'Settings adminUids array';
    } else {
      adminStatus = 'Development Bypass';
      adminMethod = 'Temporary development access';
    }
    
    console.log(`Admin Status: ${adminStatus} (${adminMethod})`);
    
    // Display admin status in the UI if there's a place for it
    const userPanel = document.getElementById('user-panel');
    if (userPanel) {
      const adminInfo = userPanel.querySelector('.admin-info');
      if (!adminInfo) {
        const adminInfoEl = document.createElement('div');
        adminInfoEl.className = 'admin-info';
        adminInfoEl.innerHTML = `
          <div class="admin-status">
            <span class="status-label">Admin:</span>
            <span class="status-value">${adminStatus}</span>
          </div>
          <div class="admin-method">
            <span class="method-label">Method:</span>
            <span class="method-value">${adminMethod}</span>
          </div>
        `;
        userPanel.appendChild(adminInfoEl);
      }
    }
    
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Admin page loaded, starting initialization...');
  
  try {
    await requireAdmin();
    console.log('Admin authentication passed');
    
    initNavigation();
    console.log('Navigation initialized');
    
    initWeekManagement();
    console.log('Week management initialized');
    
    initFixtureManagement();
    console.log('Fixture management initialized');
    
    await loadWeeks();
    console.log('Weeks loaded');
    
    await loadCurrentWeek();
    console.log('Current week loaded');
    
    // Check and display admin status
    await checkAndDisplayAdminStatus();
    console.log('Admin status checked');
    
    // If we're on the fixtures section and have a current week, load fixtures
    if (document.querySelector('#fixtures.active') && currentWeekId) {
      console.log('Loading fixtures for current week...');
      loadFixturesForCurrentWeek();
      loadExistingFixtures();
    }
    
    console.log('Admin initialization complete');
  } catch (error) {
    console.error('Error during admin initialization:', error);
  }
});

// Admin authentication check
async function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        showAuthModal();
        return;
      }
      
      console.log('User logged in:', user.email);
      
      // Check if user is admin
      try {
        const firestoreDb = await firestoreReady;
        const userDoc = await getDoc(doc(firestoreDb, 'users', user.uid));
        
        if (userDoc.exists() && userDoc.data().isAdmin) {
          console.log('User is confirmed admin');
          resolve();
          return;
        }
        
        // Check if user is in adminUids array in settings
        const settingsDoc = await getDoc(doc(firestoreDb, 'settings', 'app'));
        if (settingsDoc.exists() && settingsDoc.data().adminUids && 
            settingsDoc.data().adminUids.includes(user.uid)) {
          console.log('User is in adminUids array');
          resolve();
          return;
        }
        
        // TEMPORARY: Bypass admin check for development
        console.log('Admin check bypassed for development - user:', user.email);
        resolve();
        
      } catch (error) {
        console.error('Error checking admin status:', error);
        
        // TEMPORARY: Bypass admin check for development on error
        console.log('Admin check failed, bypassing for development - user:', user.email);
        resolve();
      }
    });
  });
}

// Show auth modal
function showAuthModal() {
  const authModal = document.getElementById('modal-auth');
  authModal.showModal();
}

// Navigation
function initNavigation() {
  console.log('Initializing navigation...');
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const sections = document.querySelectorAll('.admin-section');
  
  console.log('Found nav items:', navItems.length);
  console.log('Found sections:', sections.length);
  
  navItems.forEach((item, index) => {
    console.log(`Nav item ${index}:`, item.textContent, item.getAttribute('data-section'));
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = item.getAttribute('data-section');
      console.log('Clicked nav item:', targetSection);
      
      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show target section
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetSection) {
          section.classList.add('active');
          console.log('Activated section:', section.id);
        }
      });
      
      // Load fixtures for current week if switching to fixtures section
      if (targetSection === 'fixtures' && currentWeekId) {
        console.log('Loading fixtures for current week...');
        loadFixturesForCurrentWeek();
        loadExistingFixtures();
      }
    });
  });
  
  console.log('Navigation initialization complete');
}

// Week Management
function initWeekManagement() {
  console.log('Initializing week management...');
  console.log('btnAddWeek:', btnAddWeek);
  console.log('btnRefreshWeeks:', btnRefreshWeeks);
  console.log('btnSetCurrent:', btnSetCurrent);
  console.log('weekForm:', weekForm);
  console.log('weekFormModal:', weekFormModal);
  console.log('deleteConfirmModal:', deleteConfirmModal);
  console.log('weekSelectModal:', weekSelectModal);
  
  // Add week button
  if (btnAddWeek) {
    btnAddWeek.addEventListener('click', () => {
      openWeekForm();
    });
    console.log('Add week button event listener added');
  }
  
  // Refresh weeks button
  if (btnRefreshWeeks) {
    btnRefreshWeeks.addEventListener('click', loadWeeks);
    console.log('Refresh weeks button event listener added');
  }
  
  // Set current week button
  if (btnSetCurrent) {
    btnSetCurrent.addEventListener('click', () => {
      openCurrentWeekSelector();
    });
    console.log('Set current week button event listener added');
  }
  
  // Week form submission
  if (weekForm) {
    weekForm.addEventListener('submit', handleWeekFormSubmit);
    console.log('Week form event listener added');
  }
  
  // Week form cancel
  const weekFormCancel = document.getElementById('week-form-cancel');
  if (weekFormCancel) {
    weekFormCancel.addEventListener('click', () => {
      weekFormModal.close();
    });
    console.log('Week form cancel event listener added');
  }
  
  // Delete confirmation
  const confirmDelete = document.getElementById('confirm-delete');
  if (confirmDelete) {
    confirmDelete.addEventListener('click', () => {
      if (currentEditingWeekId) {
        deleteWeek(currentEditingWeekId);
      }
    });
    console.log('Confirm delete event listener added');
  }
  
  const cancelDelete = document.getElementById('cancel-delete');
  if (cancelDelete) {
    cancelDelete.addEventListener('click', () => {
      deleteConfirmModal.close();
    });
    console.log('Cancel delete event listener added');
  }
  
  // Week selection modal
  const cancelWeekSelect = document.getElementById('cancel-week-select');
  if (cancelWeekSelect) {
    cancelWeekSelect.addEventListener('click', () => {
      weekSelectModal.close();
    });
    console.log('Cancel week select event listener added');
  }
  
  console.log('Week management initialization complete');
}

// Open week form for adding/editing
function openWeekForm(weekId = null) {
  currentEditingWeekId = weekId;
  
  if (weekId) {
    // Editing existing week
    const week = weeks.find(w => w.id === weekId);
    if (week) {
      weekFormTitle.textContent = 'Edit Week';
      weekNameInput.value = week.name;
      weekFromDateInput.value = week.fromDate;
      weekToDateInput.value = week.toDate;
      weekStatusInput.value = week.status;
      weekDescriptionInput.value = week.description || '';
    }
  } else {
    // Adding new week
    weekFormTitle.textContent = 'Add New Week';
    weekForm.reset();
    
    // Set default dates (next weekend)
    const today = new Date();
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7);
    const nextSunday = new Date(nextFriday);
    nextSunday.setDate(nextFriday.getDate() + 2);
    
    weekFromDateInput.value = nextFriday.toISOString().split('T')[0];
    weekToDateInput.value = nextSunday.toISOString().split('T')[0];
  }
  
  weekFormModal.showModal();
}

// Handle week form submission
async function handleWeekFormSubmit(e) {
  e.preventDefault();
  
  const weekData = {
    name: weekNameInput.value.trim(),
    fromDate: weekFromDateInput.value,
    toDate: weekToDateInput.value,
    status: weekStatusInput.value,
    description: weekDescriptionInput.value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    weekFormHelper.textContent = 'Saving...';
    weekFormHelper.className = 'helper info';
    
    if (currentEditingWeekId) {
      // Update existing week
      await updateWeek(currentEditingWeekId, weekData);
      weekFormHelper.textContent = 'Week updated successfully!';
      weekFormHelper.className = 'helper success';
    } else {
      // Create new week
      await createWeek(weekData);
      weekFormHelper.textContent = 'Week created successfully!';
      weekFormHelper.className = 'helper success';
    }
    
    // Close modal and refresh
    setTimeout(() => {
      weekFormModal.close();
      loadWeeks();
    }, 1000);
    
  } catch (error) {
    console.error('Error saving week:', error);
    weekFormHelper.textContent = 'Error saving week: ' + error.message;
    weekFormHelper.className = 'helper error';
  }
}

// Create new week
async function createWeek(weekData) {
  const firestoreDb = await firestoreReady;
  const weekId = `${weekData.fromDate}_${weekData.toDate}`;
  const weekRef = doc(firestoreDb, 'weeks', weekId);
  
  await setDoc(weekRef, {
    ...weekData,
    id: weekId,
    fixtureCount: 0
  });
}

// Update existing week
async function updateWeek(weekId, weekData) {
  const firestoreDb = await firestoreReady;
  const weekRef = doc(firestoreDb, 'weeks', weekId);
  
  await updateDoc(weekRef, {
    ...weekData,
    updatedAt: new Date().toISOString()
  });
}

// Delete week
async function deleteWeek(weekId) {
  try {
    const firestoreDb = await firestoreReady;
    
    // Clean up weeklySelections document
    try {
      const weeklySelectionsRef = doc(firestoreDb, 'weeklySelections', weekId);
      await deleteDoc(weeklySelectionsRef);
      console.log(`Deleted weeklySelections for week ${weekId}`);
    } catch (weeklySelectionsError) {
      console.warn(`Could not delete weeklySelections for week ${weekId}:`, weeklySelectionsError);
    }
    
    // Clean up fixtures subcollection
    try {
      const fixturesRef = collection(firestoreDb, 'weeks', weekId, 'fixtures');
      const fixturesSnapshot = await getDocs(fixturesRef);
      const batch = writeBatch(firestoreDb);
      fixturesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Deleted ${fixturesSnapshot.size} fixtures for week ${weekId}`);
    } catch (fixturesError) {
      console.warn(`Could not delete fixtures for week ${weekId}:`, fixturesError);
    }
    
    // Delete the week document
    await deleteDoc(doc(firestoreDb, 'weeks', weekId));
    deleteConfirmModal.close();
    loadWeeks();
    
    console.log(`Successfully deleted week ${weekId} and all associated data`);
    
  } catch (error) {
    console.error('Error deleting week:', error);
    alert('Error deleting week: ' + error.message);
  }
}

// Show delete confirmation
function showDeleteConfirmation(weekId) {
  const week = weeks.find(w => w.id === weekId);
  if (week) {
    deleteWeekNameEl.textContent = week.name;
    currentEditingWeekId = weekId; // Store the week ID for deletion
    deleteConfirmModal.showModal();
  }
}

// Load all weeks
async function loadWeeks() {
  try {
    weeksLoadingEl.classList.remove('hidden');
    weeksEmptyEl.classList.add('hidden');
    weeksListEl.classList.add('hidden');
    
    const firestoreDb = await firestoreReady;
    const weeksSnapshot = await getDocs(collection(firestoreDb, 'weeks'));
    
    weeks = [];
    weeksSnapshot.forEach(doc => {
      weeks.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by creation date (newest first)
    weeks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    renderWeeksList();
    
  } catch (error) {
    console.error('Error loading weeks:', error);
    weeksLoadingEl.classList.add('hidden');
    weeksEmptyEl.classList.remove('hidden');
  }
}

// Render weeks list
function renderWeeksList() {
  weeksLoadingEl.classList.add('hidden');
  
  if (weeks.length === 0) {
    weeksEmptyEl.classList.remove('hidden');
    return;
  }
  
  weeksEmptyEl.classList.add('hidden');
  weeksListEl.classList.remove('hidden');
  
  weeksListEl.innerHTML = weeks.map(week => `
    <div class="week-item ${week.status}">
      <div class="week-header">
        <div class="week-title">
          <h4>${week.name}</h4>
          <span class="week-status-badge ${week.status}">${week.status}</span>
        </div>
        <div class="week-actions">
          <button class="btn ghost small" onclick="editWeek('${week.id}')">Edit</button>
          <button class="btn danger small" onclick="showDeleteConfirmation('${week.id}')">Delete</button>
        </div>
      </div>
      <div class="week-details">
        <div class="week-detail">
          <span class="week-detail-label">Dates:</span>
          <span class="week-detail-value">${formatDate(week.fromDate)} - ${formatDate(week.toDate)}</span>
        </div>
        ${week.description ? `
          <div class="week-detail">
            <span class="week-detail-label">Description:</span>
            <span class="week-detail-value">${week.description}</span>
          </div>
        ` : ''}
        <div class="week-detail">
          <span class="week-detail-label">Created:</span>
          <span class="week-detail-value">${formatDate(week.createdAt)}</span>
        </div>
        <div class="week-detail">
          <span class="week-detail-label">Fixtures:</span>
          <span class="week-detail-value">${week.fixtureCount || 0}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Load current week
async function loadCurrentWeek() {
  try {
    console.log('loadCurrentWeek: Starting to load current week...');
    const firestoreDb = await firestoreReady;
    const settingsRef = doc(firestoreDb, 'settings', 'app');
    const appDoc = await getDoc(settingsRef);
    
    console.log('loadCurrentWeek: Settings document exists:', appDoc.exists());
    if (appDoc.exists()) {
      const data = appDoc.data();
      console.log('loadCurrentWeek: Settings document data:', data);
      const currentDashboardWeek = data.currentDashboardWeek;
      console.log('loadCurrentWeek: currentDashboardWeek field:', currentDashboardWeek);
      
      if (currentDashboardWeek) {
        currentWeekId = currentDashboardWeek;
        console.log('loadCurrentWeek: Set currentWeekId to:', currentWeekId);
        const currentWeek = weeks.find(w => w.id === currentWeekId);
        console.log('loadCurrentWeek: Found current week in weeks array:', currentWeek);
        if (currentWeek) {
          currentWeekDisplayEl.textContent = currentWeek.name;
          if (fixturesWeekDisplayEl) {
            fixturesWeekDisplayEl.textContent = `Current Week: ${currentWeek.name}`;
          }
          console.log('loadCurrentWeek: Successfully loaded current week:', currentWeek.name);
          return;
        }
      }
    }
    
    currentWeekId = null;
    currentWeekDisplayEl.textContent = 'No active week set';
    if (fixturesWeekDisplayEl) {
      fixturesWeekDisplayEl.textContent = 'No current week set';
    }
    console.log('loadCurrentWeek: No current week found, set to null');
  } catch (error) {
    console.error('Error loading current week:', error);
    currentWeekDisplayEl.textContent = 'Error loading current week';
  }
}

// Open current week selector
function openCurrentWeekSelector() {
  if (weeks.length === 0) {
    alert('No weeks available. Please create a week first.');
    return;
  }
  
  renderWeekSelectionList();
  weekSelectModal.showModal();
}

// Render week selection list
function renderWeekSelectionList() {
  weekSelectionListEl.innerHTML = weeks.map(week => `
    <div class="week-selection-item ${week.id === currentWeekId ? 'current' : ''}" data-week-id="${week.id}">
      <div class="week-selection-details">
        <div class="week-selection-name">${week.name}</div>
        <div class="week-selection-dates">${formatDate(week.fromDate)} - ${formatDate(week.toDate)}</div>
      </div>
      <div class="week-selection-status ${week.status}">${week.status}</div>
    </div>
  `).join('');
  
  // Add click events
  weekSelectionListEl.querySelectorAll('.week-selection-item').forEach(item => {
    item.addEventListener('click', () => {
      const weekId = item.dataset.weekId;
      setCurrentWeek(weekId);
      weekSelectModal.close();
    });
  });
}

// Set current week
async function setCurrentWeek(weekId) {
  try {
    console.log('setCurrentWeek: Setting current week to:', weekId);
    const firestoreDb = await firestoreReady;
    const settingsRef = doc(firestoreDb, 'settings', 'app');
    
    const settingsData = {
      currentDashboardWeek: weekId,
      updatedAt: new Date().toISOString()
    };
    console.log('setCurrentWeek: Writing to settings document:', settingsData);
    
    await setDoc(settingsRef, settingsData, { merge: true });
    console.log('setCurrentWeek: Successfully wrote to settings document');
    
    currentWeekId = weekId;
    const currentWeek = weeks.find(w => w.id === weekId);
    currentWeekDisplayEl.textContent = currentWeek ? currentWeek.name : 'Unknown week';
    
    // Update fixtures week display
    if (fixturesWeekDisplayEl) {
      fixturesWeekDisplayEl.textContent = currentWeek ? `Current Week: ${currentWeek.name}` : 'No current week set';
    }
    
    // Refresh fixtures if we're on the fixtures section
    if (document.querySelector('#fixtures.active')) {
      loadFixturesForCurrentWeek();
      loadExistingFixtures();
    }
    
    console.log('setCurrentWeek: Current week set successfully');
    
  } catch (error) {
    console.error('Error setting current week:', error);
    alert('Error setting current week: ' + error.message);
  }
}

// Fixture Management (completed)
function initFixtureManagement() {
  console.log('Initializing fixture management...');
  console.log('adminForm:', adminForm);
  console.log('saveBtn:', saveBtn);
  console.log('btnLoadExisting:', btnLoadExisting);
  console.log('btnClearSelection:', btnClearSelection);
  console.log('btnChangeWeek:', btnChangeWeek);
  console.log('fixturesWeekDisplayEl:', fixturesWeekDisplayEl);
  
  // Load fixtures form
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate form - only dates are required now
      if (!fromDateInput.value || !toDateInput.value) {
        setStatus('Please select both from and to dates', 'error');
        return;
      }
      
      // Country and league are now optional - we'll search all major leagues
      await loadFixtures(fromDateInput.value, toDateInput.value);
    });
    console.log('Fixture form event listener added');
  }
  
  // Save selection button
  if (saveBtn) {
    saveBtn.addEventListener('click', saveFixtureSelection);
    console.log('Save button event listener added');
  }
  
  // Load existing fixtures button
  if (btnLoadExisting) {
    btnLoadExisting.addEventListener('click', loadExistingFixtures);
    console.log('Load existing button event listener added');
  }
  
  // Clear selection button
  if (btnClearSelection) {
    btnClearSelection.addEventListener('click', clearFixtureSelection);
    console.log('Clear selection button event listener added');
  }
  
  // Sync weekly selections button
  if (btnSyncWeeklySelections) {
    btnSyncWeeklySelections.addEventListener('click', syncAllWeeklySelections);
    console.log('Sync weekly selections button event listener added');
  }
  
  // Change week button
  if (btnChangeWeek) {
    btnChangeWeek.addEventListener('click', openCurrentWeekSelector);
    console.log('Change week button event listener added');
  }
  
  // Refresh leagues button
  if (btnRefreshLeagues) {
    btnRefreshLeagues.addEventListener('click', loadCountriesAndLeagues);
    console.log('Refresh leagues button event listener added');
  }
  
  // Test country change button
  const btnTestCountryChange = document.getElementById('btn-test-country-change');
  if (btnTestCountryChange) {
    btnTestCountryChange.addEventListener('click', () => {
      console.log('Test country change button clicked');
      console.log('Current country select value:', countrySelect.value);
      console.log('Current league select value:', leagueSelect.value);
      
      // Test changing to Spain
      if (countrySelect.value !== 'ES') {
        countrySelect.value = 'ES';
        console.log('Changed country to ES (Spain)');
        // Trigger the change event manually
        countrySelect.dispatchEvent(new Event('change'));
      } else {
        countrySelect.value = 'GB';
        console.log('Changed country to GB (England)');
        countrySelect.dispatchEvent(new Event('change'));
      }
    });
    console.log('Test country change button event listener added');
  }
  
  // Test 2024 fixtures button
  const btnTest2024Fixtures = document.getElementById('btn-test-2024-fixtures');
  if (btnTest2024Fixtures) {
    btnTest2024Fixtures.addEventListener('click', async () => {
      console.log('Test 2025 fixtures button clicked');
      
      // Set dates to 2025
      fromDateInput.value = '2025-08-15';
      toDateInput.value = '2025-08-18';
      
      // Set country and league
      countrySelect.value = 'GB';
      leagueSelect.value = '39';
      
      console.log('Testing fixtures with 2025 dates and Premier League');
      console.log('From date:', fromDateInput.value);
      console.log('To date:', toDateInput.value);
      console.log('Country:', countrySelect.value);
      console.log('League:', leagueSelect.value);
      
      // First check fixture availability
      try {
        console.log('Checking fixture availability for Premier League 2025...');
        const leagueResponse = await af.get('/leagues', { id: 39, season: 2025 });
        const league = leagueResponse.response?.[0];
        
        if (league) {
          const season2025 = league.seasons?.find(s => s.year === 2025);
          if (season2025) {
            console.log('2025 Season details:', season2025);
            console.log('Fixtures coverage:', season2025.coverage?.fixtures);
            console.log('Fixtures events available:', season2025.coverage?.fixtures?.events);
            
            if (!season2025.coverage?.fixtures?.events) {
              console.warn('Fixtures are NOT available for Premier League 2025 season');
              
              // Find a season with fixtures available
              const availableSeason = league.seasons?.find(s => s.coverage?.fixtures?.events === true);
              if (availableSeason) {
                console.log('Found season with fixtures available:', availableSeason.year);
                console.log('Available season coverage:', availableSeason.coverage);
                
                // Try with the available season
                console.log('Trying with available season:', availableSeason.year);
                fromDateInput.value = availableSeason.start;
                toDateInput.value = availableSeason.end;
                
                await loadFixtures(availableSeason.start, availableSeason.end);
                return;
              }
            }
          }
        }
        
        // If we get here, try with 2025 dates
        await loadFixtures('2025-08-15', '2025-08-18');
      } catch (error) {
        console.error('Error testing fixtures:', error);
      }
    });
    console.log('Test 2025 fixtures button event listener added');
  }
  
  // Find available seasons button
  const btnFindAvailableSeasons = document.getElementById('btn-find-available-seasons');
  if (btnFindAvailableSeasons) {
    btnFindAvailableSeasons.addEventListener('click', async () => {
      console.log('Find available seasons button clicked');
      
      const selectedLeague = leagueSelect.value;
      if (!selectedLeague || selectedLeague === 'all') {
        alert('Please select a specific league first');
        return;
      }
      
      try {
        setStatus('Finding available seasons with fixtures...', 'loading');
        
        const availableSeasons = await findAvailableSeasonsWithFixtures(parseInt(selectedLeague));
        
        if (availableSeasons.length === 0) {
          setStatus('No seasons with fixtures found for this league', 'error');
          return;
        }
        
        const seasonInfo = availableSeasons.map(s => 
          `${s.year}: ${s.start} to ${s.end} (${s.current ? 'Current' : 'Past'})`
        ).join('\n');
        
        const message = `Available seasons with fixtures:\n\n${seasonInfo}\n\nUse these dates to load fixtures.`;
        alert(message);
        
        setStatus(`Found ${availableSeasons.length} seasons with fixtures available`, 'success');
        
        // Auto-fill the form with the most recent available season
        const mostRecent = availableSeasons[0];
        fromDateInput.value = mostRecent.start;
        toDateInput.value = mostRecent.end;
        
        console.log('Auto-filled form with most recent available season:', mostRecent.year);
        
      } catch (error) {
        console.error('Error finding available seasons:', error);
        setStatus('Error finding available seasons: ' + error.message, 'error');
      }
    });
    console.log('Find available seasons button event listener added');
  }
  
  // Collapse All button
  const btnCollapseAll = document.getElementById('btn-collapse-all');
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      console.log('Collapse all button clicked');
      collapseAllLeagues();
    });
    console.log('Collapse all button event listener added');
  }
  
  // Expand All button
  const btnExpandAll = document.getElementById('btn-expand-all');
  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      console.log('Expand all button clicked');
      expandAllLeagues();
    });
    console.log('Expand all button event listener added');
  }
  
  // Country and league selection change events
  if (countrySelect) {
    console.log('Country select element found, adding change event listener');
    countrySelect.addEventListener('change', handleCountryChange);
    console.log('Country select event listener added');
  } else {
    console.error('Country select element not found!');
  }
  
  if (leagueSelect) {
    console.log('League select element found, adding change event listener');
    leagueSelect.addEventListener('change', handleLeagueChange);
    console.log('League select event listener added');
  } else {
    console.error('League select element not found!');
  }
  
  // Load countries and leagues on initialization
  loadCountriesAndLeagues();
  
  console.log('Fixture management initialization complete');
}

// Load countries and leagues
async function loadCountriesAndLeagues() {
  try {
    setStatus('Loading major leagues...', 'loading');
    console.log('Starting to load major leagues...');
    
    // Hardcoded list of major leagues - no API calls needed
    const majorLeagues = [
      { id: 39, name: 'Premier League', country: 'England', countryCode: 'GB' },
      { id: 140, name: 'La Liga', country: 'Spain', countryCode: 'ES' },
      { id: 78, name: 'Bundesliga', country: 'Germany', countryCode: 'DE' },
      { id: 135, name: 'Serie A', country: 'Italy', countryCode: 'IT' },
      { id: 61, name: 'Ligue 1', country: 'France', countryCode: 'FR' },
      { id: 262, name: 'Liga MX', country: 'Mexico', countryCode: 'MX' },
      { id: 253, name: 'Major League Soccer', country: 'USA/Canada', countryCode: 'US' },
      { id: 71, name: 'Brasileirão', country: 'Brazil', countryCode: 'BR' },
      { id: 103, name: 'Primera División', country: 'Argentina', countryCode: 'AR' },
      { id: 350, name: 'Saudi Pro League', country: 'Saudi Arabia', countryCode: 'SA' }
    ];
    
    console.log('Major leagues defined:', majorLeagues.length);
    
    // Populate country dropdown with only major countries
    countrySelect.innerHTML = '<option value="">Select Country</option><option value="all">All Countries</option>';
    const uniqueCountries = [...new Set(majorLeagues.map(l => l.country))];
    uniqueCountries.forEach(country => {
      countrySelect.innerHTML += `<option value="${country}">${country}</option>`;
    });

    // Set default country to England
    countrySelect.value = 'England';
    console.log('Set default country to England');
    
    // Populate league dropdown with all major leagues
    leagueSelect.innerHTML = '<option value="">Select League</option><option value="all">All Leagues</option>';
    majorLeagues.forEach(league => {
      leagueSelect.innerHTML += `<option value="${league.id}">${league.name} (${league.country})</option>`;
    });
    
    // Set default league to Premier League (ID 39)
    leagueSelect.value = '39';
    console.log('Set default league to 39 (Premier League)');
    
    setStatus('Major leagues loaded successfully', 'success');
    console.log('Major leagues loaded successfully');
    
  } catch (error) {
    console.error('Error loading major leagues:', error);
    setStatus('Error loading major leagues: ' + error.message, 'error');
  }
}

// Handle country selection change
async function handleCountryChange() {
  console.log('=== handleCountryChange called ===');
  const selectedCountry = countrySelect.value;
  console.log('Country changed to:', selectedCountry);
  
  if (selectedCountry && selectedCountry !== 'all') {
    try {
      setStatus('Loading leagues for selected country...', 'loading');
      
      // Filter leagues for the selected country from our hardcoded list
      const majorLeagues = [
        { id: 39, name: 'Premier League', country: 'England', countryCode: 'GB' },
        { id: 140, name: 'La Liga', country: 'Spain', countryCode: 'ES' },
        { id: 78, name: 'Bundesliga', country: 'Germany', countryCode: 'DE' },
        { id: 135, name: 'Serie A', country: 'Italy', countryCode: 'IT' },
        { id: 61, name: 'Ligue 1', country: 'France', countryCode: 'FR' },
        { id: 262, name: 'Liga MX', country: 'Mexico', countryCode: 'MX' },
        { id: 253, name: 'Major League Soccer', country: 'USA/Canada', countryCode: 'US' },
        { id: 71, name: 'Brasileirão', country: 'Brazil', countryCode: 'BR' },
        { id: 103, name: 'Primera División', country: 'Argentina', countryCode: 'AR' },
        { id: 350, name: 'Saudi Pro League', country: 'Saudi Arabia', countryCode: 'SA' }
      ];
      
      const countryLeagues = majorLeagues.filter(league => league.country === selectedCountry);
      console.log(`Found ${countryLeagues.length} leagues for ${selectedCountry}`);
      
      // Update league dropdown with country-specific leagues
      leagueSelect.innerHTML = '<option value="">Select League</option><option value="all">All Leagues</option>';
      
      if (countryLeagues.length === 0) {
        leagueSelect.innerHTML += '<option value="" disabled>No leagues found for this country</option>';
        setStatus('No leagues found for selected country', 'info');
      } else {
        countryLeagues.forEach(league => {
          leagueSelect.innerHTML += `<option value="${league.id}">${league.name}</option>`;
        });
        
        setStatus(`Loaded ${countryLeagues.length} leagues for ${selectedCountry}`, 'success');
      }
      
    } catch (error) {
      console.error('Error loading leagues for country:', error);
      setStatus('Error loading leagues for country: ' + error.message, 'error');
    }
  } else {
    // Reset to all leagues
    console.log('Resetting to all leagues');
    loadCountriesAndLeagues();
  }
}

// Handle league selection change
function handleLeagueChange() {
  const selectedLeague = leagueSelect.value;
  
  if (selectedLeague && selectedLeague !== 'all') {
    setStatus(`League selected: ${leagueSelect.options[leagueSelect.selectedIndex].text}`, 'info');
  } else {
    setStatus('All leagues selected', 'info');
  }
}

// Load fixtures for the current week
async function loadFixturesForCurrentWeek() {
  if (!currentWeekId) return;
  
  const currentWeek = weeks.find(w => w.id === currentWeekId);
  if (!currentWeek) return;
  
  fromDateInput.value = currentWeek.fromDate;
  toDateInput.value = currentWeek.toDate;
  
  await loadFixtures(currentWeek.fromDate, currentWeek.toDate);
  
  // Also sync the weeklySelections for the current week
  try {
    await syncCurrentWeekWeeklySelections();
  } catch (syncError) {
    console.warn('Could not sync current week weeklySelections:', syncError);
  }
}

// Load fixtures for date range
async function loadFixtures(fromDate, toDate) {
  try {
    setStatus('Loading fixtures from API...', 'loading');
    
    // Load fixtures from API-Football
    const fixtures = await loadFixturesFromAPI(fromDate, toDate);
    
    if (fixtures.length === 0) {
      setStatus('No fixtures found for selected dates', 'info');
    } else {
      setStatus(`Loaded ${fixtures.length} fixtures`, 'success');
    }
    
    currentFixtures = fixtures;
    selectedFixtures.clear();
    
    renderFixtures();
    
  } catch (error) {
    console.error('Error loading fixtures:', error);
    
    // Provide more specific error messages
    if (error.message.includes('events: false')) {
      setStatus('Fixtures are not available for the 2025 season. Use "Find Available Seasons" to see which seasons have fixtures.', 'error');
    } else if (error.message.includes('No fixtures found')) {
      setStatus('No fixtures found. The 2025 season may not have fixtures coverage yet. Try using "Find Available Seasons" to find working dates.', 'error');
    } else {
      setStatus('Error loading fixtures: ' + error.message, 'error');
    }
  }
}

// Load fixtures from API-Football
async function loadFixturesFromAPI(fromDate, toDate) {
  try {
    console.log('Loading fixtures for all major leagues from', fromDate, 'to', toDate);
    
    // Define all major leagues we want to search
    const majorLeagues = [
      { id: 39, name: 'Premier League', country: 'England', countryCode: 'GB' },
      { id: 140, name: 'La Liga', country: 'Spain', countryCode: 'ES' },
      { id: 78, name: 'Bundesliga', country: 'Germany', countryCode: 'DE' },
      { id: 135, name: 'Serie A', country: 'Italy', countryCode: 'IT' },
      { id: 61, name: 'Ligue 1', country: 'France', countryCode: 'FR' },
      { id: 262, name: 'Liga MX', country: 'Mexico', countryCode: 'MX' },
      { id: 253, name: 'Major League Soccer', country: 'USA/Canada', countryCode: 'US' },
      { id: 71, name: 'Brasileirão', country: 'Brazil', countryCode: 'BR' },
      { id: 103, name: 'Primera División', country: 'Argentina', countryCode: 'AR' },
      { id: 350, name: 'Saudi Pro League', country: 'Saudi Arabia', countryCode: 'SA' }
    ];
    
    let allFixtures = [];
    
    // Search each major league for fixtures in the date range
    for (const league of majorLeagues) {
      try {
        console.log(`Searching ${league.name} (${league.country}) for fixtures...`);
        
        // Try with season 2025 first
        let apiParams = {
          from: fromDate,
          to: toDate,
          league: league.id,
          season: 2025
        };
        
        console.log(`API params for ${league.name}:`, apiParams);
        
        let response = await af.get('/fixtures', apiParams);
        let fixtures = response.response || [];
        
        console.log(`Found ${fixtures.length} fixtures for ${league.name} with season 2025`);
        
        // If no fixtures found with 2025 season, try without season parameter
        if (fixtures.length === 0) {
          console.log(`No fixtures found for ${league.name} with season 2025, trying without season...`);
          
          apiParams = {
            from: fromDate,
            to: toDate,
            league: league.id
          };
          
          response = await af.get('/fixtures', apiParams);
          fixtures = response.response || [];
          
          console.log(`Found ${fixtures.length} fixtures for ${league.name} without season parameter`);
        }
        
        // If still no fixtures, try with 2024 season
        if (fixtures.length === 0) {
          console.log(`No fixtures found for ${league.name} without season, trying with 2024 season...`);
          
          apiParams = {
            from: fromDate,
            to: toDate,
            league: league.id,
            season: 2024
          };
          
          response = await af.get('/fixtures', apiParams);
          fixtures = response.response || [];
          
          console.log(`Found ${fixtures.length} fixtures for ${league.name} with season 2024`);
        }
        
        // Process and add fixtures for this league
        if (fixtures.length > 0) {
          const processedFixtures = fixtures.map(fixture => ({
            id: fixture.fixture.id.toString(),
            date: fixture.fixture.date,
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            league: league.name,
            leagueId: league.id,
            country: league.country,
            countryCode: league.countryCode,
            status: fixture.fixture.status.short,
            venue: fixture.fixture.venue?.name || 'TBD'
          }));
          
          allFixtures.push(...processedFixtures);
          console.log(`Added ${processedFixtures.length} fixtures from ${league.name}`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`Error loading fixtures for ${league.name}:`, error);
        // Continue with other leagues even if one fails
      }
    }
    
    console.log(`Total fixtures found across all leagues: ${allFixtures.length}`);
    
    // Sort all fixtures by date and time
    allFixtures.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return allFixtures;
    
  } catch (error) {
    console.error('API error:', error);
    
    // If API fails, return sample fixtures for testing
    if (error.message.includes('API') || error.message.includes('fetch')) {
      console.log('API unavailable, using sample fixtures for testing');
      return generateSampleFixtures(fromDate, toDate);
    }
    
    throw new Error('Failed to load fixtures from API: ' + error.message);
  }
}

// Find available seasons with fixtures for a league
async function findAvailableSeasonsWithFixtures(leagueId) {
  try {
    console.log(`Finding available seasons with fixtures for league ${leagueId}...`);
    
    const leagueResponse = await af.get('/leagues', { id: leagueId });
    const league = leagueResponse.response?.[0];
    
    if (!league) {
      console.warn('League not found');
      return [];
    }
    
    const availableSeasons = league.seasons?.filter(s => s.coverage?.fixtures?.events === true) || [];
    
    console.log(`Found ${availableSeasons.length} seasons with fixtures available:`, availableSeasons.map(s => s.year));
    
    return availableSeasons.sort((a, b) => b.year - a.year); // Most recent first
  } catch (error) {
    console.error('Error finding available seasons:', error);
    return [];
  }
}

// Process fixtures response and filter by date range
function processFixturesResponse(fixturesResponse, fromDate, toDate) {
  console.log(`Processing ${fixturesResponse.length} fixtures from API response`);
  
  // Filter fixtures by date range and format them
  const fixtures = fixturesResponse
    .filter(fixture => {
      const fixtureDate = new Date(fixture.fixture.date);
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);
      const isInRange = fixtureDate >= fromDateObj && fixtureDate <= toDateObj;
      
      console.log(`Fixture: ${fixture.teams?.home?.name} vs ${fixture.teams?.away?.name} on ${fixture.fixture.date} - In range: ${isInRange}`);
      
      return isInRange;
    })
    .map(fixture => ({
      id: fixture.fixture.id.toString(),
      date: fixture.fixture.date,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      league: fixture.league.name,
      country: fixture.league.country?.name || 'Unknown',
      status: fixture.fixture.status.short,
      venue: fixture.fixture.venue?.name || 'TBD'
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  console.log(`Found ${fixtures.length} fixtures after filtering and formatting`);
  
  return fixtures;
}

// Generate sample fixtures for testing when API is unavailable
function generateSampleFixtures(fromDate, toDate) {
  const fixtures = [];
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  // Sample teams for different leagues
  const sampleTeams = {
    'Premier League': [
      { home: 'Arsenal', away: 'Chelsea' },
      { home: 'Manchester United', away: 'Liverpool' },
      { home: 'Manchester City', away: 'Tottenham' },
      { home: 'Newcastle', away: 'Aston Villa' }
    ],
    'La Liga': [
      { home: 'Real Madrid', away: 'Barcelona' },
      { home: 'Atletico Madrid', away: 'Sevilla' },
      { home: 'Valencia', away: 'Villarreal' },
      { home: 'Athletic Bilbao', away: 'Real Sociedad' }
    ],
    'Bundesliga': [
      { home: 'Bayern Munich', away: 'Borussia Dortmund' },
      { home: 'RB Leipzig', away: 'Bayer Leverkusen' },
      { home: 'VfB Stuttgart', away: 'Eintracht Frankfurt' },
      { home: 'Hoffenheim', away: 'Wolfsburg' }
    ],
    'Serie A': [
      { home: 'Juventus', away: 'Inter Milan' },
      { home: 'AC Milan', away: 'Napoli' },
      { home: 'Roma', away: 'Lazio' },
      { home: 'Atalanta', away: 'Fiorentina' }
    ],
    'Ligue 1': [
      { home: 'PSG', away: 'Marseille' },
      { home: 'Lyon', away: 'Monaco' },
      { home: 'Nice', away: 'Lille' },
      { home: 'Rennes', away: 'Strasbourg' }
    ]
  };
  
  // Generate fixtures for each day in the range
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) { // Weekend games
      const numGames = Math.floor(Math.random() * 4) + 2; // 2-5 games per day
      
      for (let i = 0; i < numGames; i++) {
        const gameTime = new Date(d);
        gameTime.setHours(14 + i * 2, 0, 0, 0); // 2pm, 4pm, 6pm, 8pm
        
        // Select random league and teams
        const leagues = Object.keys(sampleTeams);
        const selectedLeague = leagues[Math.floor(Math.random() * leagues.length)];
        const teams = sampleTeams[selectedLeague];
        const selectedTeams = teams[Math.floor(Math.random() * teams.length)];
        
        fixtures.push({
          id: `sample-${Date.now()}-${i}`,
          date: gameTime.toISOString(),
          homeTeam: selectedTeams.home,
          awayTeam: selectedTeams.away,
          league: selectedLeague,
          country: getCountryFromLeague(selectedLeague),
          status: 'NS', // Not Started
          venue: `${selectedTeams.home} Stadium`
        });
      }
    }
  }
  
  return fixtures;
}

// Helper function to get country from league name
function getCountryFromLeague(leagueName) {
  const countryMap = {
    'Premier League': 'England',
    'La Liga': 'Spain',
    'Bundesliga': 'Germany',
    'Serie A': 'Italy',
    'Ligue 1': 'France'
  };
  return countryMap[leagueName] || 'Unknown';
}

// Render fixtures
function renderFixtures() {
  if (currentFixtures.length === 0) {
    fixturesListEl.innerHTML = `
      <div class="empty-state">
        <p>No fixtures available for selected dates</p>
        <p class="helper">Try adjusting the date range or check if the API is available</p>
      </div>
    `;
    selectedListEl.innerHTML = '<p class="empty-state">No fixtures selected</p>';
    selectedCountDisplayEl.textContent = '(0)';
    return;
  }
  
  // Group fixtures by league
  const fixturesByLeague = {};
  currentFixtures.forEach(fixture => {
    if (!fixturesByLeague[fixture.league]) {
      fixturesByLeague[fixture.league] = [];
    }
    fixturesByLeague[fixture.league].push(fixture);
  });
  
  // Render fixtures grouped by league
  let fixturesHTML = '';
  
  Object.keys(fixturesByLeague).forEach((leagueName, index) => {
    const leagueFixtures = fixturesByLeague[leagueName];
    const firstFixture = leagueFixtures[0];
    const leagueId = `league-${index}`;
    
    fixturesHTML += `
      <div class="league-section" data-league-id="${leagueId}">
        <div class="league-header" onclick="toggleLeagueSection('${leagueId}')">
          <div class="league-info">
            <h4 class="league-name">${leagueName}</h4>
            <span class="league-country">${firstFixture.country}</span>
            <span class="fixture-count">${leagueFixtures.length} fixture${leagueFixtures.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="league-toggle">
            <span class="toggle-icon">▼</span>
            <span class="toggle-text">Collapse</span>
          </div>
        </div>
        <div class="league-content expanded">
          <ul class="league-fixtures">
            ${leagueFixtures.map(fixture => `
              <li class="fixture" data-id="${fixture.id}">
                <div class="fixture-header">
                  <div class="fixture-time">
                    <span class="date">${formatDate(fixture.date)}</span>
                    <span class="time">${formatTime(fixture.date)}</span>
                  </div>
                  <div class="fixture-status">
                    <span class="status-badge ${fixture.status.toLowerCase()}">${fixture.status}</span>
                  </div>
                </div>
                <div class="fixture-teams">
                  <span class="team home">${fixture.homeTeam}</span>
                  <span class="vs">vs</span>
                  <span class="team away">${fixture.awayTeam}</span>
                </div>
                <div class="fixture-venue">
                  <span class="venue-name">${fixture.venue}</span>
                </div>
                <div class="fixture-actions">
                  <label class="checkbox-wrapper">
                    <input type="checkbox" id="fixture-${fixture.id}" ${selectedFixtures.has(fixture.id) ? 'checked' : ''}>
                    <span class="checkmark"></span>
                  </label>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  });
  
  fixturesListEl.innerHTML = fixturesHTML;
  
  // Bind checkbox events
  fixturesListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const fixtureId = e.target.closest('.fixture').dataset.id;
      if (e.target.checked) {
        selectedFixtures.add(fixtureId);
      } else {
        selectedFixtures.delete(fixtureId);
      }
      updateSelectedDisplay();
    });
  });
  
  updateSelectedDisplay();
}

// Update selected fixtures display
function updateSelectedDisplay() {
  const selectedFixturesList = Array.from(selectedFixtures).map(id => 
    currentFixtures.find(f => f.id === id)
  ).filter(Boolean);
  
  selectedListEl.innerHTML = selectedFixturesList.map(fixture => `
    <li class="fixture selected" data-id="${fixture.id}">
      <div class="fixture-teams">
        <span class="team home">${fixture.homeTeam}</span>
        <span class="vs">vs</span>
        <span class="team away">${fixture.awayTeam}</span>
      </div>
      <div class="fixture-actions">
        <button class="btn danger small" onclick="removeFixture('${fixture.id}')">Remove</button>
      </div>
    </li>
  `).join('');
  
  selectedCountDisplayEl.textContent = `(${selectedFixtures.size})`;
}

// Remove fixture from selection
function removeFixture(fixtureId) {
  selectedFixtures.delete(fixtureId);
  const checkbox = fixturesListEl.querySelector(`#fixture-${fixtureId}`);
  if (checkbox) checkbox.checked = false;
  updateSelectedDisplay();
}

// Clear all fixture selections
function clearFixtureSelection() {
  selectedFixtures.clear();
  
  // Uncheck all checkboxes
  fixturesListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  updateSelectedDisplay();
  setStatus('Selection cleared', 'info');
}

// Save fixture selection
async function saveFixtureSelection() {
  if (selectedFixtures.size === 0) {
    alert('Please select at least one fixture');
    return;
  }
  
  if (!currentWeekId) {
    alert('Please set a current week first');
    return;
  }
  
  // Show confirmation with fixture summary
  const selectedFixturesList = Array.from(selectedFixtures).map(id => 
    currentFixtures.find(f => f.id === id)
  ).filter(Boolean);
  
  const fixtureSummary = selectedFixturesList.map(f => 
    `${f.homeTeam} vs ${f.awayTeam} (${formatDate(f.date)})`
  ).join('\n');
  
  const confirmMessage = `Save ${selectedFixturesList.length} fixtures to current week?\n\n${fixtureSummary}`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    setStatus('Saving fixture selection...', 'loading');
    
    const firestoreDb = await firestoreReady;
    
    // Save fixtures to the current week
    const weekRef = doc(firestoreDb, 'weeks', currentWeekId);
    
    // Update week with fixture count
    await updateDoc(weekRef, {
      fixtureCount: selectedFixturesList.length,
      updatedAt: new Date().toISOString()
    });
    
    // Save fixtures to week's fixtures collection
    const fixturesRef = collection(weekRef, 'fixtures');
    
    // Clear existing fixtures for this week
    const existingFixtures = await getDocs(fixturesRef);
    const batch = writeBatch(firestoreDb);
    existingFixtures.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add new fixtures
    selectedFixturesList.forEach(fixture => {
      const fixtureRef = doc(fixturesRef);
      batch.set(fixtureRef, {
        ...fixture,
        weekId: currentWeekId,
        createdAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    
    // Also create/update the weeklySelections document for the main dashboard
    const weeklySelectionsRef = doc(firestoreDb, 'weeklySelections', currentWeekId);
    
    // Ensure no duplicate fixture IDs are stored
    const uniqueFixtureIds = [...new Set(selectedFixturesList.map(f => f.id))];
    if (uniqueFixtureIds.length !== selectedFixturesList.length) {
      console.warn(`Duplicate fixtures detected: ${selectedFixturesList.length} selected, ${uniqueFixtureIds.length} unique`);
    }
    
    await setDoc(weeklySelectionsRef, {
      fixtureIds: uniqueFixtureIds,
      weekId: currentWeekId,
      fixtureCount: uniqueFixtureIds.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    setStatus(`Successfully saved ${selectedFixturesList.length} fixtures to current week!`, 'success');
    
    // Refresh weeks to show updated fixture count
    loadWeeks();
    
  } catch (error) {
    console.error('Error saving fixture selection:', error);
    setStatus('Error saving selection: ' + error.message, 'error');
  }
}

// Load existing fixtures for current week
async function loadExistingFixtures() {
  if (!currentWeekId) return;
  
  try {
    setStatus('Loading existing fixtures...', 'loading');
    
    const firestoreDb = await firestoreReady;
    const weekRef = doc(firestoreDb, 'weeks', currentWeekId);
    const fixturesRef = collection(weekRef, 'fixtures');
    const fixturesSnapshot = await getDocs(fixturesRef);
    
    const existingFixtures = [];
    fixturesSnapshot.forEach(doc => {
      existingFixtures.push(doc.data());
    });
    
    // Mark existing fixtures as selected, ensuring no duplicates
    selectedFixtures.clear();
    const seenIds = new Set();
    existingFixtures.forEach(fixture => {
      if (!seenIds.has(fixture.id)) {
        selectedFixtures.add(fixture.id);
        seenIds.add(fixture.id);
      } else {
        console.warn(`Duplicate fixture ID ${fixture.id} found in existing fixtures, skipping`);
      }
    });
    
    // Update display
    updateSelectedDisplay();
    
    // Update checkboxes if fixtures are already loaded
    if (currentFixtures.length > 0) {
      fixturesListEl.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        const fixtureId = checkbox.id.replace('fixture-', '');
        checkbox.checked = selectedFixtures.has(fixtureId);
      });
    }
    
    // Sync weeklySelections document if it exists and has different fixture IDs
    try {
      const weeklySelectionsRef = doc(firestoreDb, 'weeklySelections', currentWeekId);
      const weeklySelectionsSnap = await getDoc(weeklySelectionsRef);
      
      if (weeklySelectionsSnap.exists()) {
        const storedFixtureIds = weeklySelectionsSnap.data()?.fixtureIds || [];
        const currentFixtureIds = Array.from(selectedFixtures);
        
        // Check if there's a mismatch
        if (storedFixtureIds.length !== currentFixtureIds.length || 
            !storedFixtureIds.every(id => currentFixtureIds.includes(id))) {
          
          console.log('Syncing weeklySelections with current fixtures...');
          await setDoc(weeklySelectionsRef, {
            fixtureIds: currentFixtureIds,
            weekId: currentWeekId,
            fixtureCount: currentFixtureIds.length,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (syncError) {
      console.warn('Could not sync weeklySelections:', syncError);
    }
    
    setStatus(`Loaded ${existingFixtures.length} existing fixtures for current week`, 'success');
    
  } catch (error) {
    console.error('Error loading existing fixtures:', error);
    
    // Provide more helpful error messages
    if (error.code === 'permission-denied') {
      setStatus('Permission denied. Please check if you have admin access.', 'error');
    } else if (error.code === 'unavailable') {
      setStatus('Firestore is currently unavailable. Please try again later.', 'error');
    } else {
      setStatus('Error loading existing fixtures: ' + error.message, 'error');
    }
    
    // Clear selection on error
    selectedFixtures.clear();
    updateSelectedDisplay();
  }
}

// Utility functions
function setStatus(message, type = 'info') {
  if (adminStatusEl) {
    adminStatusEl.textContent = message;
    adminStatusEl.className = `status-text ${type}`;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Toggle league section collapse/expand
function toggleLeagueSection(leagueId) {
  const leagueSection = document.querySelector(`[data-league-id="${leagueId}"]`);
  if (!leagueSection) return;
  
  const leagueContent = leagueSection.querySelector('.league-content');
  const toggleIcon = leagueSection.querySelector('.toggle-icon');
  const toggleText = leagueSection.querySelector('.toggle-text');
  
  if (leagueContent.classList.contains('expanded')) {
    // Collapse
    leagueContent.classList.remove('expanded');
    leagueContent.classList.add('collapsed');
    toggleIcon.textContent = '▶';
    toggleText.textContent = 'Expand';
  } else {
    // Expand
    leagueContent.classList.remove('collapsed');
    leagueContent.classList.add('expanded');
    toggleIcon.textContent = '▼';
    toggleText.textContent = 'Collapse';
  }
}

// Collapse all leagues
function collapseAllLeagues() {
  document.querySelectorAll('.league-section').forEach(section => {
    const leagueContent = section.querySelector('.league-content');
    const toggleIcon = section.querySelector('.toggle-icon');
    const toggleText = section.querySelector('.toggle-text');
    
    if (leagueContent.classList.contains('expanded')) {
      leagueContent.classList.remove('expanded');
      leagueContent.classList.add('collapsed');
      toggleIcon.textContent = '▶';
      toggleText.textContent = 'Expand';
    }
  });
}

// Expand all leagues
function expandAllLeagues() {
  document.querySelectorAll('.league-section').forEach(section => {
    const leagueContent = section.querySelector('.league-content');
    const toggleIcon = section.querySelector('.toggle-icon');
    const toggleText = section.querySelector('.toggle-text');
    
    if (leagueContent.classList.contains('collapsed')) {
      leagueContent.classList.remove('collapsed');
      leagueContent.classList.add('expanded');
      toggleIcon.textContent = '▼';
      toggleText.textContent = 'Collapse';
    }
  });
}

// Sync weeklySelections for current week only
async function syncCurrentWeekWeeklySelections() {
  if (!currentWeekId) return;
  
  try {
    const firestoreDb = await firestoreReady;
    const fixturesRef = collection(firestoreDb, 'weeks', currentWeekId, 'fixtures');
    const fixturesSnapshot = await getDocs(fixturesRef);
    
    const fixtureIds = [];
    fixturesSnapshot.forEach(doc => {
      fixtureIds.push(doc.data().id);
    });
    
    if (fixtureIds.length > 0) {
      // Ensure no duplicate fixture IDs
      const uniqueFixtureIds = [...new Set(fixtureIds)];
      if (uniqueFixtureIds.length !== fixtureIds.length) {
        console.warn(`Current week: Duplicate fixtures detected: ${fixtureIds.length} total, ${uniqueFixtureIds.length} unique`);
      }
      
      const weeklySelectionsRef = doc(firestoreDb, 'weeklySelections', currentWeekId);
      await setDoc(weeklySelectionsRef, {
        fixtureIds: uniqueFixtureIds,
        weekId: currentWeekId,
        fixtureCount: uniqueFixtureIds.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`Synced weeklySelections for current week ${currentWeekId} with ${uniqueFixtureIds.length} fixtures`);
    }
  } catch (error) {
    console.error('Error syncing current week weeklySelections:', error);
    throw error;
  }
}

// Sync weeklySelections for all weeks
async function syncAllWeeklySelections() {
  try {
    setStatus('Syncing weeklySelections for all weeks...', 'loading');
    
    const firestoreDb = await firestoreReady;
    const weeksSnapshot = await getDocs(collection(firestoreDb, 'weeks'));
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const weekDoc of weeksSnapshot.docs) {
      try {
        const weekId = weekDoc.id;
        const fixturesRef = collection(firestoreDb, 'weeks', weekId, 'fixtures');
        const fixturesSnapshot = await getDocs(fixturesRef);
        
        const fixtureIds = [];
        fixturesSnapshot.forEach(doc => {
          fixtureIds.push(doc.data().id);
        });
        
        if (fixtureIds.length > 0) {
          // Ensure no duplicate fixture IDs
          const uniqueFixtureIds = [...new Set(fixtureIds)];
          if (uniqueFixtureIds.length !== fixtureIds.length) {
            console.warn(`Week ${weekId}: Duplicate fixtures detected: ${fixtureIds.length} total, ${uniqueFixtureIds.length} unique`);
          }
          
          const weeklySelectionsRef = doc(firestoreDb, 'weeklySelections', weekId);
          await setDoc(weeklySelectionsRef, {
            fixtureIds: uniqueFixtureIds,
            weekId: weekId,
            fixtureCount: uniqueFixtureIds.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          syncedCount++;
        }
      } catch (weekError) {
        console.warn(`Error syncing week ${weekDoc.id}:`, weekError);
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      setStatus(`Successfully synced ${syncedCount} weeks with weeklySelections!`, 'success');
    } else {
      setStatus(`Synced ${syncedCount} weeks, ${errorCount} errors occurred`, 'warning');
    }
    
  } catch (error) {
    console.error('Error syncing weeklySelections:', error);
    setStatus('Error syncing weeklySelections: ' + error.message, 'error');
  }
}

// Global functions for onclick handlers
window.editWeek = openWeekForm;
window.showDeleteConfirmation = showDeleteConfirmation;
window.removeFixture = removeFixture;
window.toggleLeagueSection = toggleLeagueSection;
window.collapseAllLeagues = collapseAllLeagues;
window.expandAllLeagues = expandAllLeagues;
window.syncAllWeeklySelections = syncAllWeeklySelections;

// ========== LEAGUE MANAGEMENT ==========

// League form elements
const leagueForm = document.getElementById('league-form');
const leagueStatus = document.getElementById('league-status');
const leaguesList = document.getElementById('leagues-list');
const btnRefreshLeaguesList = document.getElementById('btn-refresh-leagues-list');

// Initialize league management
if (leagueForm) {
  leagueForm.addEventListener('submit', handleCreateLeague);
}

if (btnRefreshLeaguesList) {
  btnRefreshLeaguesList.addEventListener('click', loadLeagues);
}

// Load leagues on page load
if (leaguesList) {
  loadLeagues();
}

// Handle league creation
async function handleCreateLeague(event) {
  event.preventDefault();
  
  try {
    setLeagueStatus('Creating league...', 'loading');
    
    const formData = new FormData(event.target);
    const leagueData = {
      name: formData.get('admin-league-name') || document.getElementById('admin-league-name').value,
      country: formData.get('admin-league-country') || document.getElementById('admin-league-country').value,
      type: document.getElementById('admin-league-type').value,
      season: document.getElementById('admin-league-season').value,
      apiFootballId: parseInt(document.getElementById('admin-league-api-id').value) || null,
      maxParticipants: parseInt(document.getElementById('admin-league-max-participants').value) || 0,
      isPublic: document.getElementById('admin-league-is-public').checked
    };

    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    // Get current user
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create league document
    const leagueRef = doc(collection(firestoreDb, 'leagues'));
    const league = {
      id: leagueRef.id,
      ...leagueData,
      status: 'active',
      createdBy: user.uid,
      participants: [user.uid], // Creator is first participant
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(leagueRef, league);
    
    setLeagueStatus(`League "${league.name}" created successfully!`, 'success');
    leagueForm.reset();
    
    // Refresh leagues list
    await loadLeagues();
    
  } catch (error) {
    console.error('Error creating league:', error);
    setLeagueStatus('Error creating league: ' + error.message, 'error');
  }
}

// Load and display leagues
async function loadLeagues() {
  try {
    if (!leaguesList) return;
    
    leaguesList.innerHTML = '<div class="loading">Loading leagues...</div>';
    
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    const leaguesSnapshot = await getDocs(collection(firestoreDb, 'leagues'));
    const leagues = [];
    
    leaguesSnapshot.forEach(doc => {
      leagues.push({ id: doc.id, ...doc.data() });
    });

    if (leagues.length === 0) {
      leaguesList.innerHTML = '<div class="empty">No leagues found. Create your first league above.</div>';
      return;
    }

    // Sort leagues by creation date (newest first)
    leagues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const leaguesHTML = leagues.map(league => `
      <div class="league-item">
        <div class="league-info">
          <h4>${league.name}</h4>
          <p class="league-details">
            <span class="country">${league.country}</span> • 
            <span class="type">${league.type}</span> • 
            <span class="season">${league.season}</span>
          </p>
          <p class="league-status">
            Status: <span class="status-badge ${league.status}">${league.status}</span>
            ${league.maxParticipants > 0 ? `• Max: ${league.maxParticipants}` : ''}
            ${league.participants ? `• Participants: ${league.participants.length}` : ''}
          </p>
        </div>
        <div class="league-actions">
          <button class="btn secondary small" onclick="editLeague('${league.id}')">Edit</button>
          <button class="btn danger small" onclick="deleteLeague('${league.id}')">Delete</button>
        </div>
      </div>
    `).join('');

    leaguesList.innerHTML = leaguesHTML;
    
  } catch (error) {
    console.error('Error loading leagues:', error);
    if (leaguesList) {
      leaguesList.innerHTML = '<div class="error">Error loading leagues: ' + error.message + '</div>';
    }
  }
}

// Set league status message
function setLeagueStatus(message, type = 'info') {
  if (leagueStatus) {
    leagueStatus.textContent = message;
    leagueStatus.className = `status-text ${type}`;
  }
}

// Edit league (placeholder for future implementation)
window.editLeague = function(leagueId) {
  alert('Edit league functionality coming soon!');
};

// Delete league
window.deleteLeague = async function(leagueId) {
  if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) {
    return;
  }
  
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    await deleteDoc(doc(firestoreDb, 'leagues', leagueId));
    
    setLeagueStatus('League deleted successfully!', 'success');
    await loadLeagues();
    
  } catch (error) {
    console.error('Error deleting league:', error);
    setLeagueStatus('Error deleting league: ' + error.message, 'error');
  }
};

// ========== TOURNAMENT MANAGEMENT ==========

// Tournament form elements
const tournamentForm = document.getElementById('tournament-form');
const tournamentStatus = document.getElementById('tournament-status');
const tournamentsList = document.getElementById('tournaments-list');
const btnRefreshTournamentsList = document.getElementById('btn-refresh-tournaments-list');
const adminTournamentLeagueSelect = document.getElementById('admin-tournament-league');

// Initialize tournament management
if (tournamentForm) {
  tournamentForm.addEventListener('submit', handleCreateTournament);
}

if (btnRefreshTournamentsList) {
  btnRefreshTournamentsList.addEventListener('click', loadTournaments);
}

// Load tournaments on page load
if (tournamentsList) {
  loadTournaments();
}

// Populate tournament league select
function populateTournamentLeagueSelect() {
  if (!adminTournamentLeagueSelect) return;
  
  // Use the leagues already loaded for league management
  if (window.availableLeagues) {
    adminTournamentLeagueSelect.innerHTML = '<option value="">Select a league</option>';
    window.availableLeagues.forEach(league => {
      const option = document.createElement('option');
      option.value = league.id;
      option.textContent = `${league.name} (${league.country})`;
      adminTournamentLeagueSelect.appendChild(option);
    });
  }
}

// Handle tournament creation
async function handleCreateTournament(event) {
  event.preventDefault();
  
  try {
    setTournamentStatus('Creating tournament...', 'loading');
    
    const formData = new FormData(event.target);
    const tournamentData = {
      name: formData.get('admin-tournament-name') || document.getElementById('admin-tournament-name').value,
      description: '', // Admin form doesn't have description field
      leagueId: document.getElementById('admin-tournament-league').value,
      type: document.getElementById('admin-tournament-type').value,
      startDate: document.getElementById('admin-tournament-start-date').value,
      endDate: document.getElementById('admin-tournament-end-date').value,
      maxParticipants: parseInt(document.getElementById('admin-tournament-max-participants').value) || 0,
      entryFee: parseFloat(document.getElementById('admin-tournament-entry-fee').value) || 0,
      prizePool: parseFloat(document.getElementById('admin-tournament-prize-pool').value) || 0,
      isPublic: document.getElementById('admin-tournament-is-public').checked
    };

    // Validate required fields
    if (!tournamentData.leagueId) {
      throw new Error('Please select a league');
    }

    if (new Date(tournamentData.startDate) >= new Date(tournamentData.endDate)) {
      throw new Error('End date must be after start date');
    }

    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    // Get current user
    const { currentUser } = await import('./auth.js');
    const user = currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create tournament document
    const tournamentRef = doc(collection(firestoreDb, 'tournaments'));
    const tournament = {
      id: tournamentRef.id,
      ...tournamentData,
      status: 'draft',
      createdBy: user.uid,
      participants: [user.uid], // Creator is first participant
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(tournamentRef, tournament);
    
    setTournamentStatus(`Tournament "${tournament.name}" created successfully!`, 'success');
    tournamentForm.reset();
    
    // Refresh tournaments list
    await loadTournaments();
    
  } catch (error) {
    console.error('Error creating tournament:', error);
    setTournamentStatus('Error creating tournament: ' + error.message, 'error');
  }
}

// Load and display tournaments
async function loadTournaments() {
  try {
    if (!tournamentsList) return;
    
    tournamentsList.innerHTML = '<div class="loading">Loading tournaments...</div>';
    
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    const tournamentsSnapshot = await getDocs(collection(firestoreDb, 'tournaments'));
    const tournaments = [];
    
    tournamentsSnapshot.forEach(doc => {
      tournaments.push({ id: doc.id, ...doc.data() });
    });

    if (tournaments.length === 0) {
      tournamentsList.innerHTML = '<div class="empty">No tournaments found. Create your first tournament above.</div>';
      return;
    }

    // Sort tournaments by creation date (newest first)
    tournaments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const tournamentsHTML = tournaments.map(tournament => `
      <div class="tournament-item">
        <div class="tournament-info">
          <h4>${tournament.name}</h4>
          <p class="tournament-details">
            <span class="league">League ID: ${tournament.leagueId}</span> • 
            <span class="type">${tournament.type}</span> • 
            <span class="status">${tournament.status}</span>
          </p>
          <p class="tournament-dates">
            ${new Date(tournament.startDate).toLocaleDateString()} - ${new Date(tournament.endDate).toLocaleDateString()}
          </p>
          <p class="tournament-meta">
            ${tournament.maxParticipants > 0 ? `Max: ${tournament.maxParticipants} • ` : ''}
            ${tournament.participants ? `Participants: ${tournament.participants.length}` : 'Participants: 0'}
            ${tournament.entryFee > 0 ? ` • Entry: $${tournament.entryFee}` : ''}
            ${tournament.prizePool > 0 ? ` • Prize: $${tournament.prizePool}` : ''}
          </p>
        </div>
        <div class="tournament-actions">
          <button class="btn secondary small" onclick="editTournament('${tournament.id}')">Edit</button>
          <button class="btn danger small" onclick="deleteTournament('${tournament.id}')">Delete</button>
        </div>
      </div>
    `).join('');

    tournamentsList.innerHTML = tournamentsHTML;
    
  } catch (error) {
    console.error('Error loading tournaments:', error);
    if (tournamentsList) {
      tournamentsList.innerHTML = '<div class="error">Error loading tournaments: ' + error.message + '</div>';
    }
  }
}

// Set tournament status message
function setTournamentStatus(message, type = 'info') {
  if (tournamentStatus) {
    tournamentStatus.textContent = message;
    tournamentStatus.className = `status-text ${type}`;
  }
}

// Edit tournament (placeholder for future implementation)
window.editTournament = function(tournamentId) {
  alert('Edit tournament functionality coming soon!');
};

// Delete tournament
window.deleteTournament = async function(tournamentId) {
  if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
    return;
  }
  
  try {
    const firestoreDb = await firestoreReady;
    if (!firestoreDb) {
      throw new Error('Database not available');
    }

    await deleteDoc(doc(firestoreDb, 'tournaments', tournamentId));
    
    setTournamentStatus('Tournament deleted successfully!', 'success');
    await loadTournaments();
    
  } catch (error) {
    console.error('Error deleting tournament:', error);
    setTournamentStatus('Error deleting tournament: ' + error.message, 'error');
  }
};

// Populate tournament league select when leagues are loaded
if (window.loadLeagues) {
  const originalLoadLeagues = window.loadLeagues;
  window.loadLeagues = async function() {
    await originalLoadLeagues();
    populateTournamentLeagueSelect();
  };
}

