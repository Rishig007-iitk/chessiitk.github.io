// Tournament Management System for Chess Club IITK
let tournaments = JSON.parse(localStorage.getItem('chess_tournaments')) || [];
let globalRatings = JSON.parse(localStorage.getItem('iitk_global_ratings')) || {};
let activeTournamentIndex = null;
let isCoordinator = false;

// UI Elements
const tournamentList = document.getElementById('tournament-list');
const newTournamentModal = document.getElementById('new-tournament-modal');
const tournamentDashboard = document.getElementById('tournament-dashboard');
const btnNewTournament = document.getElementById('btn-new-tournament');
const btnResetRatings = document.getElementById('btn-reset-ratings');
const closeNewTourney = document.querySelector('.close-new-tourney');
const btnCoordinatorLogin = document.getElementById('btn-coordinator-login');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderTournamentList();
    renderGlobalRatings();
    
    if (btnNewTournament) {
        btnNewTournament.onclick = () => {
            newTournamentModal.style.display = 'flex';
        };
    }
    
    if (closeNewTourney) {
        closeNewTourney.onclick = () => {
            newTournamentModal.style.display = 'none';
        };
    }
    
    window.onclick = (event) => {
        if (event.target == newTournamentModal) newTournamentModal.style.display = 'none';
        if (event.target == tournamentDashboard) closeDashboard();
    };
});

// Coordinator Mode Logic
window.toggleCoordinatorMode = function() {
    if (!isCoordinator) {
        const password = prompt("Enter coordinator password:");
        if (password === "chessclubiitk") {
            isCoordinator = true;
            btnCoordinatorLogin.innerText = "Logout (Coordinator)";
            btnCoordinatorLogin.style.background = "#00ff00";
            btnCoordinatorLogin.style.color = "#000";
            updateCoordinatorUI();
        } else {
            alert("Incorrect password!");
        }
    } else {
        isCoordinator = false;
        btnCoordinatorLogin.innerText = "Coordinator Login";
        btnCoordinatorLogin.style.background = "var(--main-color)";
        btnCoordinatorLogin.style.color = "var(--bg-color)";
        updateCoordinatorUI();
    }
}

function updateCoordinatorUI() {
    // Show/Hide "Create New Tournament" and "Reset Ratings"
    if (btnNewTournament) btnNewTournament.style.display = isCoordinator ? 'inline-block' : 'none';
    if (btnResetRatings) btnResetRatings.style.display = isCoordinator ? 'inline-block' : 'none';
    
    // Update active dashboard if open
    if (activeTournamentIndex !== null) {
        const controls = document.getElementById('coordinator-player-controls');
        const thAction = document.getElementById('th-player-action');
        const btnPairings = document.getElementById('btn-generate-pairings');
        
        if (controls) controls.style.display = isCoordinator ? 'flex' : 'none';
        if (thAction) thAction.style.display = isCoordinator ? 'table-cell' : 'none';
        if (btnPairings) btnPairings.style.display = isCoordinator ? 'inline-block' : 'none';
        
        renderPlayers();
        renderPairings();
    }
    
    renderTournamentList();
}

window.resetGlobalRatings = function() {
    if (!isCoordinator) return alert("Access denied.");
    
    if (confirm("CRITICAL: Are you sure you want to permanently delete ALL global ratings? This cannot be undone.")) {
        globalRatings = {};
        saveData();
        renderGlobalRatings();
        alert("All global ratings have been cleared.");
    }
}

// Tournament CRUD
window.createNewTournament = function() {
    if (!isCoordinator) return alert("Access denied. Coordinator login required.");

    const nameInput = document.getElementById('new-tourney-name');
    const typeInput = document.getElementById('new-tourney-type');
    
    const name = nameInput.value;
    const type = typeInput.value;
    
    if (!name) return alert("Please enter a tournament name");
    
    const newTourney = {
        name,
        type,
        players: [],
        rounds: [], 
        currentRound: 0,
        status: 'setup' 
    };
    
    tournaments.push(newTourney);
    saveData();
    renderTournamentList();
    newTournamentModal.style.display = 'none';
    nameInput.value = '';
}

function renderTournamentList() {
    if (!tournamentList) return;
    tournamentList.innerHTML = '';
    tournaments.forEach((t, index) => {
        const card = document.createElement('div');
        card.className = 'tournament-card';
        card.onclick = () => openDashboard(index);

        let typeName = 'Swiss';
        if (t.type === 'round-robin') typeName = 'Round Robin';
        else if (t.type === 'double-round-robin') typeName = 'Double Round Robin';
        else if (t.type === 'knockout') typeName = 'Knockout';
        else if (t.type === 'team') typeName = 'Team';

        card.innerHTML = `
            <h3>${t.name}</h3>
            <p>Type: ${typeName}</p>
            <p>Players: ${t.players.length}</p>
            <p>Status: ${t.status.toUpperCase()}</p>
            ${isCoordinator ? `<button class="btn-main" style="margin-top: 10px; background: #ff4444; color: white; width: 100%;" onclick="event.stopPropagation(); deleteTournament(${index})">Delete</button>` : ''}
        `;
        tournamentList.appendChild(card);
    });
}

window.deleteTournament = function(index) {
    if (!isCoordinator) return alert("Access denied. Coordinator login required.");

    if (confirm("Are you sure you want to delete this tournament? All ratings earned here will be revoked.")) {
        tournaments.splice(index, 1);
        recalculateGlobalRatings();
        saveData();
        renderTournamentList();
        renderGlobalRatings();
    }
}

// Dashboard Logic
window.openDashboard = function(index) {
    activeTournamentIndex = index;
    const t = tournaments[index];
    document.getElementById('dash-tournament-name').innerText = t.name;
    tournamentDashboard.style.display = 'flex';
    
    // Reset tabs to default (Players) using classes and explicit display
    const tabLinks = document.getElementsByClassName("tab-link");
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
        tabContents[i].style.display = "none";
    }
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }
    
    const playersTab = document.getElementById('players-tab');
    playersTab.classList.add("active");
    playersTab.style.display = "flex";
    tabLinks[0].classList.add("active");

    // UI Visibility based on coordinator status
    const controls = document.getElementById('coordinator-player-controls');
    const thAction = document.getElementById('th-player-action');
    const btnPairings = document.getElementById('btn-generate-pairings');
    const teamInput = document.getElementById('player-team-input');

    if (controls) controls.style.display = isCoordinator ? 'flex' : 'none';
    if (thAction) thAction.style.display = isCoordinator ? 'table-cell' : 'none';
    if (btnPairings) btnPairings.style.display = isCoordinator ? 'inline-block' : 'none';
    
    // Only show Team Name input for Team Tournaments
    if (teamInput) teamInput.style.display = (isCoordinator && t.type === 'team') ? 'inline-block' : 'none';

    renderPlayers();
    renderPairings();
    renderStandings();
    updateRoundDisplay();
}

window.closeDashboard = function() {
    tournamentDashboard.style.display = 'none';
    activeTournamentIndex = null;
}

window.openTab = function(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    const tabLinks = document.getElementsByClassName("tab-link");
    
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
        tabContents[i].style.display = "none";
    }
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }
    
    const targetTab = document.getElementById(tabName);
    targetTab.classList.add("active");
    targetTab.style.display = "flex";
    evt.currentTarget.classList.add("active");
    
    // Trigger re-render of content when switching tabs to be sure
    if (tabName === 'rounds-tab') renderPairings();
    if (tabName === 'standings-tab') renderStandings();
    if (tabName === 'players-tab') renderPlayers();
}

// Player Management
window.addPlayerToTournament = function() {
    if (!isCoordinator) return alert("Access denied.");

    const name = document.getElementById('player-name-input').value.trim();
    const roll = document.getElementById('player-roll-input').value.trim();
    const team = document.getElementById('player-team-input').value.trim();
    const initialRating = parseInt(document.getElementById('player-rating-input').value) || null;

    if (!name || !roll) return alert("Both Name and Roll No are required");
    
    addPlayerInternal(name, roll, initialRating, team);
    
    document.getElementById('player-name-input').value = '';
    document.getElementById('player-roll-input').value = '';
    document.getElementById('player-team-input').value = '';
    document.getElementById('player-rating-input').value = '';
}

function addPlayerInternal(name, roll, rating = null, team = '') {
    const t = tournaments[activeTournamentIndex];
    if (t.status !== 'setup') return alert("Cannot add players to an active/finished tournament");
    
    // Check if player is already in this tournament
    if (t.players.find(p => p.roll === roll)) return alert("Player with this Roll No is already in the tournament");

    // Initialize or retrieve global rating based on Roll No
    if (!globalRatings[roll]) {
        globalRatings[roll] = {
            name: name,
            baseRating: rating || 1200,
            rating: rating || 1200,
            matchesPlayed: 0
        };
    } else {
        // Update name in global ratings if it has changed
        globalRatings[roll].name = name;
        if (!globalRatings[roll].baseRating) {
            globalRatings[roll].baseRating = globalRatings[roll].rating || 1200;
        }
    }
    
    const playerRating = globalRatings[roll].rating;

    t.players.push({
        id: roll, // Use roll as the unique ID
        roll: roll,
        name,
        team: team || 'Independent',
        rating: playerRating,
        points: 0,
        buchholz: 0,
        history: [], 
        opponents: [], 
        colorHistory: [] 
    });
    
    saveData();
    renderPlayers();
    renderGlobalRatings();
}

// Bulk Add Logic
window.bulkAddPlayers = function(event) {
    if (!isCoordinator) return alert("Access denied.");
    
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("No data found in the file.");
                return;
            }

            jsonData.forEach(row => {
                // Flexible mapping
                const name = row.Name || row.name || row.Player || row.player;
                
                // Check for various Roll No formats including with dots
                const roll = row.Roll || row.roll || row['Roll No'] || row['roll no'] || 
                             row['Roll No.'] || row['roll no.'] || row['Roll Number'];
                
                // Try to find rating - check explicit header, or look for the first unnamed column if it exists
                let rating = row.Rating || row.rating || null;
                if (rating === null) {
                    // Look for common empty headers SheetJS uses for unnamed columns
                    rating = row['__EMPTY_1'] || row['__EMPTY'] || null;
                }
                
                const team = row.Team || row.team || '';

                if (name && roll) {
                    addPlayerInternal(name.toString().trim(), roll.toString().trim(), rating, team);
                }
            });
            
            alert(`Bulk add completed. Check the player list.`);
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Error processing file. Please ensure it is a valid Excel or CSV file.");
        }
        event.target.value = ''; // Reset input
    };
    reader.onerror = (error) => {
        console.error("File reading error:", error);
        alert("Failed to read file.");
    };
    reader.readAsArrayBuffer(file);
}

function renderPlayers() {
    const t = tournaments[activeTournamentIndex];
    const tbody = document.querySelector('#dash-player-table tbody');
    tbody.innerHTML = '';
    t.players.forEach((p, idx) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.roll}</td>
            <td>${p.name}</td>
            <td>${p.rating.toFixed(0)}</td>
            ${isCoordinator ? `<td><button class="btn-main" style="background: #ff4444; padding: 0.5rem 1rem; font-size: 1.2rem;" onclick="removePlayer(${idx})">Remove</button></td>` : ''}
        `;
    });
}

window.removePlayer = function(idx) {
    if (!isCoordinator) return;
    const t = tournaments[activeTournamentIndex];
    if (t.status !== 'setup') return;
    t.players.splice(idx, 1);
    saveData();
    renderPlayers();
}

// Pairing Algorithm
function generatePairings() {
    if (!isCoordinator) return;

    const t = tournaments[activeTournamentIndex];
    
    if (t.rounds.length > 0) {
        const lastRound = t.rounds[t.rounds.length - 1];
        const unfinished = lastRound.filter(p => p.result === null);
        if (unfinished.length > 0) return alert("Please record all results for the current round first.");
    }

    if (t.players.length < 2) return alert("Add at least 2 players");

    t.status = 'active';
    const roundNumber = t.rounds.length + 1;
    let pairings = [];
    
    if (t.type === 'swiss') {
        pairings = generateSwissPairings(t);
    } else if (t.type === 'team') {
        pairings = generateTeamPairings(t);
    } else if (t.type === 'round-robin' || t.type === 'double-round-robin') {
        pairings = generateRoundRobinPairings(t);
    } else if (t.type === 'knockout') {
        pairings = generateKnockoutPairings(t);
    }

    if (pairings && pairings.length > 0) {
        t.rounds.push(pairings);
        t.currentRound = roundNumber;
        saveData();
        renderPairings();
        renderStandings();
        updateRoundDisplay();
    }
}

function generateTeamPairings(t) {
    const teams = [];
    const teamMap = {};

    t.players.forEach(p => {
        if (!teamMap[p.team]) {
            teamMap[p.team] = { name: p.team, players: [], mp: 0, gp: 0, opponents: [] };
            teams.push(teamMap[p.team]);
        }
        teamMap[p.team].players.push(p);
    });

    // Calculate team MP and GP from history
    teams.forEach(team => {
        team.gp = team.players.reduce((sum, p) => sum + p.points, 0);
        // Identify opponents from individual history
        team.players.forEach(p => {
            p.history.forEach(h => {
                const opp = t.players.find(pl => pl.roll === h.opponentId);
                if (opp && opp.team !== team.name && !team.opponents.includes(opp.team)) {
                    team.opponents.push(opp.team);
                }
            });
        });
        
        // Match points calculation (derived)
        let mp = 0;
        for (let r = 0; r < t.rounds.length; r++) {
            let teamPoints = 0;
            let oppTeamPoints = 0;
            let foundMatch = false;
            t.rounds[r].forEach(p => {
                if (p.white.team === team.name) {
                    foundMatch = true;
                    if (p.result === '1-0') teamPoints += 1;
                    else if (p.result === '0-1') oppTeamPoints += 1;
                    else if (p.result === '1/2-1/2') { teamPoints += 0.5; oppTeamPoints += 0.5; }
                } else if (p.black.team === team.name) {
                    foundMatch = true;
                    if (p.result === '0-1') teamPoints += 1;
                    else if (p.result === '1-0') oppTeamPoints += 1;
                    else if (p.result === '1/2-1/2') { teamPoints += 0.5; oppTeamPoints += 0.5; }
                }
            });
            if (foundMatch) {
                if (teamPoints > oppTeamPoints) mp += 2;
                else if (teamPoints === oppTeamPoints && teamPoints > 0) mp += 1;
            }
        }
        team.mp = mp;
    });

    // Sort teams by MP then GP
    teams.sort((a, b) => b.mp - a.mp || b.gp - a.gp);

    let roundPairings = [];
    let unassigned = [...teams];

    while (unassigned.length > 0) {
        let t1 = unassigned.shift();
        let t2Index = -1;

        for (let i = 0; i < unassigned.length; i++) {
            if (!t1.opponents.includes(unassigned[i].name)) {
                t2Index = i;
                break;
            }
        }

        if (t2Index !== -1) {
            let t2 = unassigned.splice(t2Index, 1)[0];
            t1.players.sort((a, b) => b.rating - a.rating);
            t2.players.sort((a, b) => b.rating - a.rating);
            
            const boards = Math.min(t1.players.length, t2.players.length);
            const matchId = `match_${Date.now()}_${t1.name}_${t2.name}`;
            for (let i = 0; i < boards; i++) {
                roundPairings.push({ 
                    white: t1.players[i], 
                    black: t2.players[i], 
                    result: null,
                    matchId: matchId 
                });
            }
        }
    }
    return roundPairings;
}

function generateKnockoutPairings(t) {
    let winners = [];
    if (t.rounds.length === 0) {
        winners = [...t.players];
    } else {
        const lastRound = t.rounds[t.rounds.length - 1];
        lastRound.forEach(p => {
            if (p.result === '1-0') winners.push(t.players.find(pl => pl.roll === p.white.roll));
            else if (p.result === '0-1') winners.push(t.players.find(pl => pl.roll === p.black.roll));
        });
    }

    if (winners.length < 2) {
        alert("Tournament already has a winner!");
        return null;
    }

    // Shuffle for initial round
    if (t.rounds.length === 0) {
        winners.sort(() => Math.random() - 0.5);
    }

    let roundPairings = [];
    if (winners.length % 2 !== 0) {
        const luckyPlayer = winners.shift();
        roundPairings.push({ white: luckyPlayer, black: { name: 'BYE', id: 'BYE', roll: 'BYE' }, result: '1-0' });
    }

    for (let i = 0; i < winners.length; i += 2) {
        roundPairings.push({ white: winners[i], black: winners[i+1], result: null });
    }
    return roundPairings;
}

function generateSwissPairings(t) {
    let players = [...t.players].sort((a, b) => b.points - a.points || b.rating - a.rating);
    let paired = new Set();
    let roundPairings = [];

    if (players.length % 2 !== 0) {
        for (let i = players.length - 1; i >= 0; i--) {
            if (!players[i].history.some(h => h.opponentId === 'BYE')) {
                const byePlayer = players[i];
                const pairing = { white: byePlayer, black: { name: 'BYE', id: 'BYE' }, result: '1-0' };
                roundPairings.push(pairing);
                recordResultInternal(t.rounds.length, roundPairings.length - 1, '1-0'); 
                paired.add(byePlayer.id);
                break;
            }
        }
    }

    let unassigned = players.filter(p => !paired.has(p.id));
    
    while (unassigned.length > 0) {
        let p1 = unassigned.shift();
        let p2Index = -1;

        for (let i = 0; i < unassigned.length; i++) {
            if (!p1.opponents.includes(unassigned[i].id)) {
                p2Index = i;
                break;
            }
        }

        if (p2Index !== -1) {
            let p2 = unassigned.splice(p2Index, 1)[0];
            let p1W = p1.colorHistory.filter(c => c === 'W').length;
            let p1B = p1.colorHistory.length - p1W;
            let p2W = p2.colorHistory.filter(c => c === 'W').length;
            let p2B = p2.colorHistory.length - p2W;

            let white, black;
            if (p1W - p1B > p2W - p2B) {
                white = p2; black = p1;
            } else {
                white = p1; black = p2;
            }
            roundPairings.push({ white, black, result: null });
        } else if (unassigned.length > 0) {
            let p2 = unassigned.shift();
            roundPairings.push({ white: p1, black: p2, result: null });
        }
    }
    return roundPairings;
}

function generateRoundRobinPairings(t) {
    let players = [...t.players];
    if (players.length % 2 !== 0) players.push({ name: 'BYE', id: 'BYE' });
    
    const numRounds = players.length - 1;
    const roundIdx = t.rounds.length;
    
    if (roundIdx >= numRounds) {
        alert("Tournament finished!");
        return null;
    }

    let roundPairings = [];
    const n = players.length;
    for (let i = 0; i < n / 2; i++) {
        let p1 = players[(roundIdx + i) % (n - 1)];
        let p2 = players[(n - 1 - i + roundIdx) % (n - 1)];
        if (i === 0) p1 = players[n - 1]; 

        if (p1.id === 'BYE' || p2.id === 'BYE') {
            let realPlayer = p1.id === 'BYE' ? p2 : p1;
            const pairing = { white: realPlayer, black: { name: 'BYE', id: 'BYE' }, result: '1-0' };
            roundPairings.push(pairing);
            recordResultInternal(roundIdx, roundPairings.length - 1, '1-0');
        } else {
            roundPairings.push({ white: p1, black: p2, result: null });
        }
    }
    return roundPairings;
}

// Elo Rating Update
function calculateElo(rating1, rating2, score) {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    return rating1 + K * (score - expected);
}

// Result Recording
window.recordResult = function(pairingIdx, result) {
    if (!isCoordinator) return;
    const t = tournaments[activeTournamentIndex];
    const roundIdx = t.rounds.length - 1;
    recordResultInternal(roundIdx, pairingIdx, result);
    saveData();
    renderPairings();
    renderStandings();
    renderGlobalRatings();
}

function recordResultInternal(roundIdx, pairingIdx, result) {
    const t = tournaments[activeTournamentIndex];
    const pairing = t.rounds[roundIdx][pairingIdx];
    if (pairing.result && pairing.result !== null && pairing.black.id !== 'BYE') return; 

    pairing.result = result;
    const white = t.players.find(p => p.roll === pairing.white.roll);
    const black = t.players.find(p => p.roll === pairing.black.roll);

    if (white && black) {
        let wScore = 0, bScore = 0;
        if (result === '1-0') { wScore = 1; bScore = 0; }
        else if (result === '0-1') { wScore = 0; bScore = 1; }
        else if (result === '1/2-1/2') { wScore = 0.5; bScore = 0.5; }

        white.points += wScore;
        white.gamePoints = (white.gamePoints || 0) + wScore;
        white.history.push({ opponentId: black.roll, result: wScore, color: 'W' });

        if (black.id !== 'BYE') {
            black.points += bScore;
            black.gamePoints = (black.gamePoints || 0) + bScore;
            black.history.push({ opponentId: white.roll, result: bScore, color: 'B' });
        }
    }

    recalculateGlobalRatings();
    calculateBuchholz(t);
}

function calculateBuchholz(t) {
    t.players.forEach(p => {
        p.buchholz = p.history.reduce((sum, h) => {
            if (h.opponentId === 'BYE') return sum;
            const opp = t.players.find(pl => pl.roll === h.opponentId);
            return sum + (opp ? opp.points : 0);
        }, 0);
    });
}

// UI Rendering
function renderPairings() {
    const t = tournaments[activeTournamentIndex];
    const list = document.getElementById('pairings-list');
    list.innerHTML = '';
    
    if (t.rounds.length === 0) {
        list.innerHTML = '<p style="font-size: 1.6rem; color: rgba(255,255,255,0.6);">No pairings generated yet.</p>';
        return;
    }

    const currentRound = t.rounds[t.rounds.length - 1];
    currentRound.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'pairing-row';
        div.innerHTML = `
            <span style="font-size: 1.8rem; font-weight: 500;">${p.white.name} (${p.white.roll}) vs ${p.black.name} (${p.black.roll})</span>
            <div class="result-btns">
                ${p.result ? `<strong style="font-size: 1.8rem; color: var(--main-color);">${p.result}</strong>` : (isCoordinator ? `
                    <button class="btn-main" style="padding: 0.5rem 1rem; font-size: 1.4rem;" onclick="recordResult(${idx}, '1-0')">1-0</button>
                    <button class="btn-main" style="padding: 0.5rem 1rem; font-size: 1.4rem;" onclick="recordResult(${idx}, '1/2-1/2')">1/2</button>
                    <button class="btn-main" style="padding: 0.5rem 1rem; font-size: 1.4rem;" onclick="recordResult(${idx}, '0-1')">0-1</button>
                ` : `<em style="font-size: 1.6rem; color: rgba(255,255,255,0.4);">Pending</em>`)}
            </div>
        `;
        list.appendChild(div);
    });
}

function renderStandings() {
    const t = tournaments[activeTournamentIndex];
    const tbody = document.querySelector('#standings-table tbody');
    tbody.innerHTML = '';
    
    if (t.type === 'team') {
        const teamStats = {};
        t.players.forEach(p => {
            if (!teamStats[p.team]) teamStats[p.team] = { name: p.team, mp: 0, gp: 0 };
        });

        // Recalculate MP and GP based on all rounds
        t.rounds.forEach(round => {
            const matches = {};
            round.forEach(p => {
                if (!p.matchId) return;
                if (!matches[p.matchId]) matches[p.matchId] = { wPoints: 0, bPoints: 0, wTeam: p.white.team, bTeam: p.black.team };
                if (p.result === '1-0') matches[p.matchId].wPoints += 1;
                else if (p.result === '0-1') matches[p.matchId].bPoints += 1;
                else if (p.result === '1/2-1/2') { matches[p.matchId].wPoints += 0.5; matches[p.matchId].bPoints += 0.5; }
            });
            Object.values(matches).forEach(m => {
                teamStats[m.wTeam].gp += m.wPoints;
                teamStats[m.bTeam].gp += m.bPoints;
                if (m.wPoints > m.bPoints) teamStats[m.wTeam].mp += 2;
                else if (m.bPoints > m.wPoints) teamStats[m.bTeam].mp += 2;
                else if (m.wPoints === m.bPoints && m.wPoints > 0) { teamStats[m.wTeam].mp += 1; teamStats[m.bTeam].mp += 1; }
            });
        });

        const sortedTeams = Object.values(teamStats).sort((a, b) => b.mp - a.mp || b.gp - a.gp);
        sortedTeams.forEach((team, idx) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${idx + 1}</td>
                <td>${team.name}</td>
                <td>${team.mp} MP</td>
                <td>${team.gp} GP</td>
            `;
        });
    } else {
        let sortedPlayers = [...t.players].sort((a, b) => b.points - a.points || b.buchholz - a.buchholz || b.rating - a.rating);
        sortedPlayers.forEach((p, idx) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${idx + 1}</td>
                <td>${p.name} (${p.roll})</td>
                <td>${p.points}</td>
                <td>${p.buchholz}</td>
            `;
        });
    }
}

function renderGlobalRatings() {
    const tbody = document.querySelector('#global-ratings-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (tournaments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; font-size: 1.6rem; padding: 3rem; color: rgba(255,255,255,0.4);">No tournaments have been held yet. Global ratings will appear here once matches are recorded.</td></tr>';
        return;
    }
    
    let sortedRatingList = Object.keys(globalRatings).map(roll => ({
        roll,
        ...globalRatings[roll]
    })).filter(p => p.matchesPlayed > 0) // Only show players who have actually played matches
      .sort((a, b) => b.rating - a.rating);

    if (sortedRatingList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; font-size: 1.6rem; padding: 3rem; color: rgba(255,255,255,0.4);">No matches have been recorded yet.</td></tr>';
        return;
    }

    sortedRatingList.forEach((p, idx) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${p.roll}</td>
            <td>${p.name}</td>
            <td>${p.rating.toFixed(0)}</td>
            <td>${p.matchesPlayed}</td>
        `;
    });
}

function updateRoundDisplay() {
    const t = tournaments[activeTournamentIndex];
    document.getElementById('current-round-display').innerText = `Round ${t.currentRound}`;
}

function saveData() {
    localStorage.setItem('chess_tournaments', JSON.stringify(tournaments));
    localStorage.setItem('iitk_global_ratings', JSON.stringify(globalRatings));
}

function recalculateGlobalRatings() {
    // 1. Reset all ratings to baseRating and matchesPlayed to 0
    for (let roll in globalRatings) {
        if (!globalRatings[roll].baseRating) {
            globalRatings[roll].baseRating = globalRatings[roll].rating || 1200;
        }
        globalRatings[roll].rating = globalRatings[roll].baseRating;
        globalRatings[roll].matchesPlayed = 0;
    }

    // 2. Iterate through all tournaments in order and re-apply all match results
    tournaments.forEach(t => {
        t.rounds.forEach(round => {
            round.forEach(pairing => {
                if (pairing.result && pairing.black && pairing.black.id !== 'BYE') {
                    const whiteRoll = pairing.white.roll;
                    const blackRoll = pairing.black.roll;
                    
                    if (globalRatings[whiteRoll] && globalRatings[blackRoll]) {
                        let wScore = 0;
                        if (pairing.result === '1-0') wScore = 1;
                        else if (pairing.result === '0-1') wScore = 0;
                        else if (pairing.result === '1/2-1/2') wScore = 0.5;

                        const oldRatingW = globalRatings[whiteRoll].rating;
                        const oldRatingB = globalRatings[blackRoll].rating;

                        globalRatings[whiteRoll].rating = calculateElo(oldRatingW, oldRatingB, wScore);
                        globalRatings[blackRoll].rating = calculateElo(oldRatingB, oldRatingW, 1 - wScore);
                        
                        globalRatings[whiteRoll].matchesPlayed++;
                        globalRatings[blackRoll].matchesPlayed++;
                    }
                }
            });
        });
    });
}
