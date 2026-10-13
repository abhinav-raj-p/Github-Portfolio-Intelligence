document.addEventListener('DOMContentLoaded', async () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const searchSection = document.getElementById('search-section');
    const resultsBox = document.getElementById('results');
    const searchBtn = document.getElementById('search-btn');
    const candidateInput = document.getElementById('candidate-username');
    const viewFavoritesBtn = document.getElementById('view-favorites-btn');
    const favoritesSection = document.getElementById('favorites-section');
    const favoritesList = document.getElementById('favorites-list');
    const closeFavoritesBtn = document.getElementById('close-favorites-btn');

    // Modal elements
    const commitsModal = document.getElementById('commits-modal');
    const closeCommitsBtn = document.getElementById('close-commits-modal');
    const commitsList = document.getElementById('commits-list');
    const modalRepoName = document.getElementById('modal-repo-name');

    // Improve profile modal elements
    const aspirantActions = document.getElementById('aspirant-actions');
    const improveProfileBtn = document.getElementById('improve-profile-btn');
    const improveModal = document.getElementById('improve-modal');
    const closeImproveModal = document.getElementById('close-improve-modal');
    const improveLoading = document.getElementById('improve-loading');
    const improveSuggestions = document.getElementById('improve-suggestions');
    const applyFixesBtn = document.getElementById('apply-fixes-btn');

    // Pitch elements
    const pitchModal = document.getElementById('pitch-modal');
    const closePitchModal = document.getElementById('close-pitch-modal');
    const pitchLoading = document.getElementById('pitch-loading');
    const pitchTextarea = document.getElementById('pitch-textarea');
    const copyPitchBtn = document.getElementById('copy-pitch-btn');

    // Navbar & Buttons
    const backHomeBtn = document.getElementById('back-home-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const roleAspirantBtn = document.getElementById('role-aspirant-btn');
    const roleRecruiterBtn = document.getElementById('role-recruiter-btn');
    const recruiterBypassBtn = document.getElementById('recruiter-bypass-btn');
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const choiceAspirant = document.getElementById('choice-aspirant');
    const choiceRecruiter = document.getElementById('choice-recruiter');
    const loginLink = document.querySelector('a[href="/auth/github"]');

    let currentRole = 'aspirant';
    let currentUser = null;
    let currentReport = null;
    let currentFixes = null;
    let radarChartInstance = null;

    // Helper: hide and clear K-Means cluster output
    function hideClusterResults() {
        const clusterPanel = document.getElementById('cluster-results');
        const clusterGroups = document.getElementById('cluster-groups');
        if (clusterPanel) clusterPanel.style.display = 'none';
        if (clusterGroups) clusterGroups.innerHTML = '';
    }
    window.hideClusterResults = hideClusterResults;

    // Determine initial role: Query param > sessionStorage > localStorage > default ('aspirant')
    const urlParams = new URLSearchParams(window.location.search);
    const paramRole = urlParams.get('role');

    if (paramRole === 'aspirant' || paramRole === 'recruiter') {
        currentRole = paramRole;
        localStorage.setItem('role', currentRole);
        sessionStorage.setItem('gitview_role', currentRole);
    } else if (sessionStorage.getItem('gitview_role') === 'recruiter' || sessionStorage.getItem('gitview_role') === 'aspirant') {
        currentRole = sessionStorage.getItem('gitview_role');
        localStorage.setItem('role', currentRole);
    } else if (localStorage.getItem('role') === 'recruiter' || localStorage.getItem('role') === 'aspirant') {
        currentRole = localStorage.getItem('role');
    } else {
        currentRole = 'aspirant';
        localStorage.setItem('role', 'aspirant');
        sessionStorage.setItem('gitview_role', 'aspirant');
    }

    // Role state management function
    function applyRole(role, reAnalyze = true) {
        currentRole = role;
        localStorage.setItem('role', role);
        sessionStorage.setItem('gitview_role', role);

        // Hide any existing K-Means results whenever role changes
        hideClusterResults();

        const roleStatusText = document.getElementById('role-status-text');
        const aspirantLoginBox = document.getElementById('aspirant-login-box');

        if (role === 'aspirant') {
            if (roleAspirantBtn) roleAspirantBtn.classList.add('active');
            if (roleRecruiterBtn) roleRecruiterBtn.classList.remove('active', 'recruiter-pill');
            if (roleStatusText) roleStatusText.textContent = 'ENGINEER VIEW';

            if (choiceAspirant) choiceAspirant.classList.add('selected');
            if (choiceRecruiter) choiceRecruiter.classList.remove('selected');
            const aspRadio = document.querySelector('input[name="role"][value="aspirant"]');
            if (aspRadio) aspRadio.checked = true;

            if (recruiterBypassBtn) recruiterBypassBtn.style.display = 'none';
            if (aspirantLoginBox) aspirantLoginBox.style.display = 'block';

            searchSection.style.display = 'none';
            viewFavoritesBtn.style.display = 'none';
            favoritesSection.style.display = 'none';

            if (currentReport && resultsBox.style.display !== 'none') {
                if (aspirantActions) aspirantActions.style.display = 'block';
            }

            if (currentUser && reAnalyze) {
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                analyzeUser(currentUser.username || currentUser.login);
            }
        } else {
            // Recruiter role
            if (roleAspirantBtn) roleAspirantBtn.classList.remove('active');
            if (roleRecruiterBtn) roleRecruiterBtn.classList.add('active', 'recruiter-pill');
            if (roleStatusText) roleStatusText.textContent = 'RECRUITER PORTAL';

            if (choiceAspirant) choiceAspirant.classList.remove('selected');
            if (choiceRecruiter) choiceRecruiter.classList.add('selected');
            const recRadio = document.querySelector('input[name="role"][value="recruiter"]');
            if (recRadio) recRadio.checked = true;

            if (recruiterBypassBtn) recruiterBypassBtn.style.display = 'flex';
            if (aspirantLoginBox) aspirantLoginBox.style.display = 'none';

            // Recruiter can use dashboard without login
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            searchSection.style.display = 'block';
            viewFavoritesBtn.style.display = 'inline-flex';

            if (aspirantActions) aspirantActions.style.display = 'none';
        }
    }

    // Role switcher navbar buttons
    if (roleAspirantBtn) {
        roleAspirantBtn.addEventListener('click', () => applyRole('aspirant', true));
    }
    if (roleRecruiterBtn) {
        roleRecruiterBtn.addEventListener('click', () => applyRole('recruiter', false));
    }

    // Choice card clicks in login view
    if (choiceAspirant) {
        choiceAspirant.addEventListener('click', () => applyRole('aspirant', false));
    }
    if (choiceRecruiter) {
        choiceRecruiter.addEventListener('click', () => applyRole('recruiter', false));
    }

    // Radio change listeners
    roleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyRole(e.target.value, false);
        });
    });

    if (recruiterBypassBtn) {
        recruiterBypassBtn.addEventListener('click', () => {
            applyRole('recruiter', false);
        });
    }

    if (loginLink) {
        loginLink.addEventListener('click', () => {
            localStorage.setItem('role', 'aspirant');
            sessionStorage.setItem('gitview_role', 'aspirant');
        });
    }

    // Check Authentication
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';

            // Apply selected role
            applyRole(currentRole, true);
        } else {
            // Not authenticated: if user specifically asked for recruiter, show recruiter dashboard directly
            if (currentRole === 'recruiter') {
                applyRole('recruiter', false);
            } else {
                applyRole('aspirant', false);
                loginSection.style.display = 'block';
                dashboardSection.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error checking auth', err);
        if (currentRole === 'recruiter') {
            applyRole('recruiter', false);
        }
    }

    // Direct username input for quick instant analysis without GitHub login
    const directInput = document.getElementById('direct-username-input');
    const directBtn = document.getElementById('direct-analyze-btn');
    if (directBtn && directInput) {
        const runDirect = () => {
            const username = directInput.value.trim();
            if (username) {
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                analyzeUser(username);
            }
        };
        directBtn.addEventListener('click', runDirect);
        directInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runDirect();
        });
    }

    // Search button click
    searchBtn.addEventListener('click', () => {
        const username = candidateInput.value.trim();
        if (username) analyzeUser(username);
    });

    candidateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    // Favorites Logic
    viewFavoritesBtn.addEventListener('click', async () => {
        hideClusterResults(); // Hide K-Means output when viewing favorites
        favoritesSection.style.display = 'block';
        resultsBox.style.display = 'none';
        favoritesList.innerHTML = '<p style="color:#7bd0ff;">Loading saved candidates...</p>';
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();

            if (data.error) {
                favoritesList.innerHTML = `<p style="color:#f87171">Error loading favorites</p>`;
                return;
            }

            if (data.length === 0) {
                favoritesList.innerHTML = '<p style="color:#9b8f80; font-size:13px;">No saved candidates yet. Analyze a profile to save candidates.</p>';
                return;
            }

            // Group by drive_name
            const grouped = {};
            data.forEach(candidate => {
                const drive = candidate.drive_name || 'General';
                if (!grouped[drive]) grouped[drive] = [];
                grouped[drive].push(candidate);
            });

            let html = '';
            for (const [drive, candidates] of Object.entries(grouped)) {
                html += `<h4 style="margin-top: 18px; color: var(--accent-peach); border-bottom: 1px solid rgba(255,205,130,0.12); padding-bottom: 6px; font-size:0.95rem;">Drive: ${drive}</h4>`;
                html += candidates.map(c => `
                    <div class="saved-item">
                        <div style="display:flex; align-items:center;">
                            <img src="${c.avatar_url}" style="width:42px; height:42px; border-radius:50%; margin-right:12px; border:1px solid rgba(255,205,130,0.25);" alt="${c.candidate_username}">
                            <div class="saved-item-info" style="margin-left: 0;">
                                <strong>${c.candidate_name || c.candidate_username}</strong>
                                <div>@${c.candidate_username}</div>
                            </div>
                        </div>
                        <strong class="mono" style="color:var(--accent-peach); font-size:14px;">Score: ${c.score}/100</strong>
                        <div style="display:flex; gap: 8px;">
                            <button class="btn btn-outline" style="padding: 6px 14px; font-size:12px;" onclick="loadCandidate('${c.candidate_username}')">View</button>
                            <button class="btn" style="padding: 6px 12px; font-size:12px; background: rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#fca5a5;" onclick="deleteCandidate('${c.candidate_username}')">🗑️</button>
                        </div>
                    </div>
                `).join('');
            }
            favoritesList.innerHTML = html;
        } catch (err) {
            favoritesList.innerHTML = `<p style="color:#f87171">Error loading favorites.</p>`;
        }
    });

    window.deleteCandidate = async (username) => {
        if (!confirm(`Are you sure you want to remove @${username} from your saved candidates?`)) return;
        try {
            const res = await fetch(`/api/favorites/${username}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                viewFavoritesBtn.click(); // Refresh list
            } else {
                alert("Failed to delete candidate.");
            }
        } catch (err) {
            alert("Error deleting candidate.");
        }
    };

    window.loadCandidate = (username) => {
        candidateInput.value = username;
        favoritesSection.style.display = 'none';
        hideClusterResults(); // Hide K-Means output when loading another candidate
        analyzeUser(username);
    };

    closeFavoritesBtn.addEventListener('click', () => {
        favoritesSection.style.display = 'none';
        hideClusterResults();
        if (currentReport) resultsBox.style.display = 'block';
    });

    closeCommitsBtn.addEventListener('click', () => {
        commitsModal.style.display = 'none';
    });

    window.openCommitsModal = async (username, repo) => {
        commitsModal.style.display = 'flex';
        modalRepoName.innerText = repo;
        commitsList.innerHTML = '<p style="color:#7bd0ff;">Loading commits...</p>';
        try {
            const res = await fetch(`/api/commits/${username}/${repo}`);
            const data = await res.json();
            if (data.error) {
                commitsList.innerHTML = `<p style="color:#f87171">Error: ${data.error}</p>`;
                return;
            }
            if (data.length === 0) {
                commitsList.innerHTML = '<p style="color:#9b8f80;">No recent commits found.</p>';
                return;
            }
            commitsList.innerHTML = data.map(c => `
                <div class="commit-item">
                    <p><strong>${c.message.split('\n')[0]}</strong></p>
                    <small>${new Date(c.date).toLocaleString()} — <a href="${c.url}" target="_blank" style="color:var(--accent-cyan); text-decoration:none;">View on GitHub</a></small>
                </div>
            `).join('');
        } catch (err) {
            commitsList.innerHTML = `<p style="color:#f87171">Failed to load commits.</p>`;
        }
    };

    improveProfileBtn.addEventListener('click', async () => {
        improveModal.style.display = 'flex';
        improveLoading.style.display = 'block';
        improveSuggestions.style.display = 'none';
        applyFixesBtn.style.display = 'none';

        try {
            const res = await fetch('/api/suggest-fixes');
            const data = await res.json();

            improveLoading.style.display = 'none';
            if (data.error) {
                improveSuggestions.innerHTML = `<p style="color:#f87171">Error: ${data.error}</p>`;
                improveSuggestions.style.display = 'block';
                return;
            }

            currentFixes = data.suggestions;

            if (!currentFixes || Object.keys(currentFixes).length === 0) {
                improveSuggestions.innerHTML = `<p style="color:#34d399;">Your profile is already well-configured! No critical missing fields detected.</p>`;
                improveSuggestions.style.display = 'block';
                return;
            }

            let html = `<p style="color:#dae2fd; margin-bottom:12px;">We noticed some empty fields on your GitHub. Here's what AI suggests you update:</p><ul style="padding-left:18px;">`;
            for (const [key, val] of Object.entries(currentFixes)) {
                html += `<li style="margin-bottom:10px;"><strong style="color:var(--accent-peach);">${key.toUpperCase()}:</strong> <span style="color:#ffefdd;">${val}</span></li>`;
            }
            html += `</ul>`;

            improveSuggestions.innerHTML = html;
            improveSuggestions.style.display = 'block';
            applyFixesBtn.style.display = 'inline-flex';

        } catch (err) {
            improveLoading.style.display = 'none';
            improveSuggestions.innerHTML = `<p style="color:#f87171">Failed to fetch AI suggestions.</p>`;
            improveSuggestions.style.display = 'block';
        }
    });

    closeImproveModal.addEventListener('click', () => {
        improveModal.style.display = 'none';
    });

    applyFixesBtn.addEventListener('click', async () => {
        if (!currentFixes) return;
        applyFixesBtn.disabled = true;
        applyFixesBtn.innerText = 'Applying fixes to GitHub...';

        try {
            const res = await fetch('/api/apply-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentFixes)
            });
            const data = await res.json();

            if (data.success) {
                applyFixesBtn.innerText = 'Success! Profile Updated.';
                setTimeout(() => {
                    improveModal.style.display = 'none';
                    applyFixesBtn.disabled = false;
                    applyFixesBtn.innerText = 'Fix It For Me (Apply to GitHub)';
                    if (currentReport) analyzeUser(currentReport.username);
                }, 2000);
            } else {
                applyFixesBtn.innerText = 'Error applying fixes';
                setTimeout(() => {
                    applyFixesBtn.innerText = 'Fix It For Me (Apply to GitHub)';
                    applyFixesBtn.disabled = false;
                }, 2000);
            }
        } catch (err) {
            applyFixesBtn.innerText = 'Failed request';
            setTimeout(() => {
                applyFixesBtn.innerText = 'Fix It For Me (Apply to GitHub)';
                applyFixesBtn.disabled = false;
            }, 2000);
        }
    });

    closePitchModal.addEventListener('click', () => {
        pitchModal.style.display = 'none';
    });

    copyPitchBtn.addEventListener('click', () => {
        pitchTextarea.select();
        document.execCommand('copy');
        copyPitchBtn.innerText = 'Copied to Clipboard!';
        setTimeout(() => copyPitchBtn.innerText = 'Copy to Clipboard', 2000);
    });

    window.draftPitch = async () => {
        if (!currentReport) return;
        pitchModal.style.display = 'flex';
        pitchLoading.style.display = 'block';
        pitchTextarea.style.display = 'none';
        copyPitchBtn.style.display = 'none';

        try {
            const res = await fetch('/api/draft-pitch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentReport)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errText.substring(0, 50)}...`);
            }

            const data = await res.json();
            pitchLoading.style.display = 'none';
            if (data.error) {
                pitchTextarea.value = 'Error generating pitch: ' + data.error;
            } else {
                pitchTextarea.value = data.emailText;
                copyPitchBtn.style.display = 'inline-flex';
            }
            pitchTextarea.style.display = 'block';
        } catch (err) {
            pitchLoading.style.display = 'none';
            pitchTextarea.value = `Failed to generate pitch.\nDetails: ${err.message}`;
            pitchTextarea.style.display = 'block';
        }
    };

    async function analyzeUser(username) {
        hideClusterResults(); // CRITICAL: Always hide K-Means output when analyzing any user
        resultsBox.style.display = 'block';
        favoritesSection.style.display = 'none';
        resultsBox.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <span class="material-symbols-outlined animate-spin" style="font-size:32px; color:var(--accent-peach); margin-bottom:12px;">progress_activity</span>
                <p style="color:var(--text-white); font-size:1.1rem; font-weight:600; margin-bottom:4px;">Analyzing @${username}...</p>
                <p style="color:var(--text-secondary); font-size:13px;">Fetching public repositories, scoring engineering metrics, and running NLP...</p>
            </div>`;

        try {
            const res = await fetch(`/api/analyze/${username}`);
            const data = await res.json();

            if (data.error) {
                resultsBox.innerHTML = `<div style="padding:20px; color:#f87171; text-align:center;"><p>Error: ${data.error}</p></div>`;
                return;
            }

            currentReport = data;
            window.lastReport = data; // Expose for cluster feature
            renderResults(data);
        } catch (err) {
            resultsBox.innerHTML = `<div style="padding:20px; color:#f87171; text-align:center;"><p>Error fetching candidate data.</p></div>`;
        }
    }

    window.saveCandidate = async () => {
        if (!currentReport) return;
        const btn = document.getElementById('save-candidate-btn');

        const driveName = prompt("Enter Recruitment Drive (leave blank for General):");
        if (driveName === null) return;

        btn.disabled = true;
        btn.innerText = 'Saving...';

        try {
            const res = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentReport.username,
                    score: currentReport.scores.total,
                    avatar_url: currentReport.avatar_url,
                    name: currentReport.name,
                    drive_name: driveName
                })
            });
            const result = await res.json();
            if (result.success) {
                btn.innerText = 'Saved!';
            } else {
                btn.innerText = 'Error Saving';
            }
        } catch (err) {
            btn.innerText = 'Error Saving';
        }
    };

    function renderResults(data) {
        let languagesHtml = Object.entries(data.top_languages || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lang, count]) => `${lang} (${count})`)
            .join(', ');

        const s = data.scores;
        const formattedAiSummary = (data.aiSummary || '')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        let saveBtnHtml = currentRole === 'recruiter'
            ? `<div style="margin-left:auto; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn btn-cluster" onclick="document.getElementById('cluster-repos-btn').click()">
                    <span class="material-symbols-outlined" style="font-size:16px;">category</span> Cluster Repos
                </button>
                <button id="draft-pitch-btn" class="btn btn-outline" onclick="draftPitch()">
                    <span class="material-symbols-outlined" style="font-size:16px;">mail</span> AI Outreach Pitch
                </button>
                <button id="save-candidate-btn" class="btn btn-peach" onclick="saveCandidate()">
                    <span class="material-symbols-outlined" style="font-size:16px;">bookmark</span> Save Candidate
                </button>
               </div>`
            : '';

        let reposHtml = '';
        if (data.repositories && data.repositories.length > 0) {
            reposHtml = `
            <div style="margin-top: 32px;">
                <h4 style="color:var(--accent-peach); font-size:1.15rem; margin-bottom:16px;">Top Repositories (${data.repositories.length})</h4>
                <div class="repos-grid">
                    ${data.repositories.map(repo => {
                        let linksHtml = '';
                        if (repo.homepage) {
                            linksHtml += `<a href="${repo.homepage}" target="_blank" onclick="event.stopPropagation();" class="repo-badge">🌐 Live</a> `;
                        }
                        if (repo.apkUrl) {
                            linksHtml += `<a href="${repo.apkUrl}" target="_blank" onclick="event.stopPropagation();" class="repo-badge">📱 APK</a>`;
                        }
                        if (repo.hasReadme) {
                            linksHtml += `<span class="repo-badge" style="background:rgba(255,205,130,0.15); color:var(--accent-peach); border-color:rgba(255,205,130,0.3);">📖 Docs</span>`;
                        }

                        return `
                        <div class="repo-card" onclick="openCommitsModal('${data.username}', '${repo.name}')">
                            <h5>${repo.name}</h5>
                            <p>${repo.description ? repo.description.substring(0, 80) + (repo.description.length > 80 ? '...' : '') : 'No description provided'}</p>
                            <div class="stats">
                                <span>⭐ ${repo.stargazers_count}</span>
                                <span>${repo.language || 'Code'}</span>
                            </div>
                            ${linksHtml ? `<div style="margin-top:10px;">${linksHtml}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        resultsBox.innerHTML = `
            <div class="profile-header">
                <img src="${data.avatar_url}" alt="Avatar">
                <div>
                    <h3 style="margin:0; font-size:1.6rem; color:#ffefdd;">${data.name || data.username}</h3>
                    <div class="mono" style="font-size:13px; color:#7bd0ff; margin-top:2px;">@${data.username}</div>
                    ${data.bio ? `<p style="margin:6px 0 0 0; color:var(--text-secondary); font-size:13px; max-width:540px;">${data.bio}</p>` : ''}
                </div>
                ${saveBtnHtml}
            </div>

            <div class="score">
                <span>Total Engineering Score: <span style="background:linear-gradient(90deg,#ffcd82,#7bd0ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${s.total} / 100</span></span>
                <span class="score-badge">${s.total >= 80 ? 'EXCEPTIONAL' : s.total >= 60 ? 'STRONG' : 'EMERGING'}</span>
            </div>
            
            <div style="display:flex; gap: 32px; margin-bottom: 24px; flex-wrap:wrap;">
                <div style="flex: 1; min-width:280px;">
                    <h4 style="color:var(--accent-peach); font-size:1.05rem; margin-bottom:14px;">Algorithmic Radar Shape</h4>
                    <div style="position: relative; height:260px; width:100%; margin-bottom:20px; background:rgba(11,19,38,0.5); border:1px solid rgba(255,205,130,0.08); border-radius:14px; padding:10px;">
                        <canvas id="scoreRadarChart"></canvas>
                    </div>
                </div>

                <div style="flex: 1; min-width:280px;">
                    <h4 style="color:var(--accent-peach); font-size:1.05rem; margin-bottom:14px;">Classic Dimensions</h4>
                    <div class="progress-container">
                        <div class="progress-label"><span>Impact (Stars, Forks)</span> <span>${s.impact}/40</span></div>
                        <div class="progress-bar"><div class="progress-fill impact" style="width: ${(s.impact / 40) * 100}%;"></div></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label"><span>Activity (Repos, Recency)</span> <span>${s.activity}/30</span></div>
                        <div class="progress-bar"><div class="progress-fill activity" style="width: ${(s.activity / 30) * 100}%;"></div></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label"><span>Network (Followers)</span> <span>${s.network}/15</span></div>
                        <div class="progress-bar"><div class="progress-fill network" style="width: ${(s.network / 15) * 100}%;"></div></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label"><span>Profile Completeness</span> <span>${s.profile}/15</span></div>
                        <div class="progress-bar"><div class="progress-fill profile" style="width: ${(s.profile / 15) * 100}%;"></div></div>
                    </div>

                    <div style="margin-top:20px; padding-top:14px; border-top:1px solid rgba(255,205,130,0.08);">
                        <div class="metric"><span>Public Repos:</span> <strong>${data.public_repos}</strong></div>
                        <div class="metric"><span>Total Stars:</span> <strong>${data.total_stars}</strong></div>
                        <div class="metric"><span>Followers:</span> <strong>${data.followers}</strong></div>
                        <div class="metric"><span>Top Languages:</span> <strong>${languagesHtml || 'None'}</strong></div>
                    </div>
                </div>
            </div>
            
            ${reposHtml}

            <div class="ai-summary">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-symbols-outlined text-primary-container" style="font-size:20px;">auto_awesome</span>
                    <h4 style="margin:0; color:var(--accent-peach); font-size:1.1rem;">
                        ${currentRole === 'aspirant' ? 'Personalized Improvement Insights' : 'AI Candidate Summary'}
                    </h4>
                </div>
                <div style="font-size:13.5px; line-height:1.7; color:#dae2fd;">${formattedAiSummary}</div>
            </div>
        `;

        // Render Radar Chart with landing page color palette
        const ctx = document.getElementById('scoreRadarChart').getContext('2d');
        if (radarChartInstance) radarChartInstance.destroy();

        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Impact (40)', 'Activity (30)', 'Network (15)', 'Profile (15)'],
                datasets: [{
                    label: 'Score Shape',
                    data: [
                        (s.impact / 40) * 100,
                        (s.activity / 30) * 100,
                        (s.network / 15) * 100,
                        (s.profile / 15) * 100
                    ],
                    backgroundColor: 'rgba(255, 205, 130, 0.22)',
                    borderColor: '#ffcd82',
                    borderWidth: 2,
                    pointBackgroundColor: '#7bd0ff',
                    pointBorderColor: '#ffefdd',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#7bd0ff',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(218, 226, 253, 0.1)' },
                        grid: { color: 'rgba(218, 226, 253, 0.08)' },
                        pointLabels: {
                            color: '#dae2fd',
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
                        },
                        ticks: { display: false, min: 0, max: 100 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // Aspirant-specific actions
        if (currentRole === 'aspirant') {
            aspirantActions.style.display = 'block';
        } else {
            aspirantActions.style.display = 'none';
        }
    }

    // Initialize K-Means Clustering
    const clusterBtn = document.getElementById('cluster-repos-btn');
    const closeClusterBtn = document.getElementById('close-cluster-btn');

    if (closeClusterBtn) {
        closeClusterBtn.addEventListener('click', hideClusterResults);
    }

    if (clusterBtn) {
        clusterBtn.addEventListener('click', async () => {
            const repoCards = document.querySelectorAll('.repo-card');
            if (repoCards.length === 0) {
                alert('Please analyze a profile first to load repositories.');
                return;
            }

            const repos = (window.lastReport && window.lastReport.repositories) ? window.lastReport.repositories : [];
            const allRepos = (window.lastReport && window.lastReport.all_repositories)
                ? window.lastReport.all_repositories
                : repos;

            if (allRepos.length < 2) {
                alert('Need at least 2 repositories to cluster.');
                return;
            }

            const originalText = clusterBtn.innerHTML;
            clusterBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:18px;">progress_activity</span> Clustering...';
            clusterBtn.disabled = true;

            try {
                const response = await fetch('/api/cluster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repos: allRepos })
                });
                const data = await response.json();

                if (data.error) throw new Error(data.error);

                renderClusters(data.clusters);
            } catch (err) {
                alert('Clustering failed: ' + err.message);
            } finally {
                clusterBtn.innerHTML = originalText;
                clusterBtn.disabled = false;
            }
        });
    }

    function renderClusters(clusters) {
        const container = document.getElementById('cluster-groups');
        const panel = document.getElementById('cluster-results');
        const colors = ['#ffcd82', '#7bd0ff', '#a78bfa', '#34d399', '#f472b6'];

        container.innerHTML = '';
        clusters.forEach((cluster, i) => {
            const color = colors[i % colors.length];
            const card = document.createElement('div');
            card.style.cssText = `border: 1px solid ${color}40; border-radius: 14px; padding: 18px; margin-bottom: 16px; background: rgba(11, 19, 38, 0.65); backdrop-filter: blur(10px);`;

            const tags = cluster.repos.map(r =>
                `<span style="background:${color}18; border:1px solid ${color}45; color:${color}; border-radius:999px; padding:4px 12px; font-size:11px; font-family:'JetBrains Mono',monospace; margin:3px; display:inline-block;">${r.name}</span>`
            ).join('');

            card.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:12px;">
                <span style="width:10px; height:10px; border-radius:50%; background:${color}; box-shadow:0 0 10px ${color}; margin-right:10px;"></span>
                <strong style="font-size:1.05rem; color:#ffefdd; font-family:'Plus Jakarta Sans',sans-serif;">${cluster.label}</strong>
                <span style="margin-left:auto; font-size:11px; font-family:'JetBrains Mono',monospace; color:#9b8f80; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:999px;">
                    ${cluster.repos.length} repo${cluster.repos.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">${tags}</div>`;
            container.appendChild(card);
        });

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
