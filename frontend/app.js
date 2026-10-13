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

    // Navigation and Action buttons
    const backHomeBtn = document.getElementById('back-home-btn');
    const topHomepageBtn = document.getElementById('top-homepage-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const roleIndicator = document.getElementById('current-role-indicator');

    // Role selection elements
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const loginLink = document.getElementById('login-link');
    const recruiterBypassBtn = document.getElementById('recruiter-bypass-btn');
    const continueSignedInBtn = document.getElementById('continue-signedin-btn');
    const userStatusBar = document.getElementById('user-status-bar');
    const loggedInUsernameEl = document.getElementById('logged-in-username');
    const aspirantQuickSearch = document.getElementById('aspirant-quick-search');

    // Modals
    const commitsModal = document.getElementById('commits-modal');
    const closeCommitsBtn = document.getElementById('close-commits-modal');
    const commitsList = document.getElementById('commits-list');
    const modalRepoName = document.getElementById('modal-repo-name');

    // Improve profile modal
    const aspirantActions = document.getElementById('aspirant-actions');
    const improveProfileBtn = document.getElementById('improve-profile-btn');
    const improveModal = document.getElementById('improve-modal');
    const closeImproveModal = document.getElementById('close-improve-modal');
    const improveLoading = document.getElementById('improve-loading');
    const improveSuggestions = document.getElementById('improve-suggestions');
    const applyFixesBtn = document.getElementById('apply-fixes-btn');

    // Recruiter AI Pitch modal
    const pitchModal = document.getElementById('pitch-modal');
    const closePitchModal = document.getElementById('close-pitch-modal');
    const pitchLoading = document.getElementById('pitch-loading');
    const pitchTextarea = document.getElementById('pitch-textarea');
    const copyPitchBtn = document.getElementById('copy-pitch-btn');

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

    // Helper: set button loading state with spinner circle animation
    function setBtnLoading(btn, isLoading, fallbackText, loadingText = 'Analyzing profile, it may take some time...') {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            if (!btn.dataset.originalHtml) {
                btn.dataset.originalHtml = btn.innerHTML;
            }
            btn.innerHTML = `<span class="spinner"></span> <span>${loadingText}</span>`;
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            } else if (fallbackText) {
                btn.innerHTML = fallbackText;
            }
        }
    }

    // Enter a specific role in the dashboard
    function enterDashboard(role) {
        currentRole = role;
        localStorage.setItem('role', role);
        sessionStorage.setItem('gitview_role', role);

        hideClusterResults();

        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';

        if (role === 'recruiter') {
            if (roleIndicator) roleIndicator.textContent = 'RECRUITER';
            searchSection.style.display = 'block';
            viewFavoritesBtn.style.display = 'inline-block';
            if (aspirantActions) aspirantActions.style.display = 'none';
        } else {
            if (roleIndicator) roleIndicator.textContent = 'ASPIRANT';
            searchSection.style.display = 'none';
            viewFavoritesBtn.style.display = 'none';
            favoritesSection.style.display = 'none';

            if (currentUser) {
                analyzeUser(currentUser.username || currentUser.login);
            }
        }
    }

    // Update role choice UI inside login/role section
    function updateRoleSelectionUI(selectedRole) {
        if (currentUser) {
            // User IS signed in: they choose role with the continue button
            if (continueSignedInBtn) {
                continueSignedInBtn.style.display = 'block';
                continueSignedInBtn.textContent = selectedRole === 'recruiter'
                    ? 'Continue as Recruiter (Search Candidates)'
                    : 'Continue as Aspirant (Analyze My Profile)';
            }
            if (loginLink) loginLink.style.display = 'none';
            if (recruiterBypassBtn) recruiterBypassBtn.style.display = 'none';
            if (aspirantQuickSearch) aspirantQuickSearch.style.display = selectedRole === 'aspirant' ? 'block' : 'none';
        } else {
            // User is NOT signed in
            if (continueSignedInBtn) continueSignedInBtn.style.display = 'none';
            if (selectedRole === 'recruiter') {
                if (recruiterBypassBtn) recruiterBypassBtn.style.display = 'block';
                if (loginLink) loginLink.style.display = 'none';
                if (aspirantQuickSearch) aspirantQuickSearch.style.display = 'none';
            } else {
                if (recruiterBypassBtn) recruiterBypassBtn.style.display = 'none';
                if (loginLink) loginLink.style.display = 'inline-block';
                if (aspirantQuickSearch) aspirantQuickSearch.style.display = 'block';
            }
        }
    }

    // Role radio change
    roleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentRole = e.target.value;
            localStorage.setItem('role', currentRole);
            updateRoleSelectionUI(currentRole);
        });
    });

    // Continue button when signed in
    if (continueSignedInBtn) {
        continueSignedInBtn.addEventListener('click', () => {
            const checked = document.querySelector('input[name="role"]:checked');
            const chosen = checked ? checked.value : 'aspirant';
            if (chosen === 'aspirant') {
                setBtnLoading(continueSignedInBtn, true, continueSignedInBtn.textContent);
            }
            enterDashboard(chosen);
        });
    }

    // Recruiter bypass when not signed in
    if (recruiterBypassBtn) {
        recruiterBypassBtn.addEventListener('click', () => {
            enterDashboard('recruiter');
        });
    }

    // Login link click - show loading spinner in case of network delay
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            const checked = document.querySelector('input[name="role"]:checked');
            const chosen = checked ? checked.value : 'aspirant';
            localStorage.setItem('role', chosen);
            sessionStorage.setItem('gitview_role', chosen);

            setBtnLoading(loginLink, true, 'Login with GitHub');
        });
    }

    // Back button in dashboard - navigate back to app.html
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? '/app.html'
                : 'https://gitview-sooty.vercel.app/app.html';
            window.location.href = target;
        });
    }

    // Top-left corner HomePage button - navigate to landing page
    if (topHomepageBtn) {
        topHomepageBtn.addEventListener('click', (e) => {
            // Navigate directly to landing page link
            window.location.href = 'https://gitview-sooty.vercel.app';
        });
    }

    // Direct username input for quick testing
    const directInput = document.getElementById('direct-username-input');
    const directBtn = document.getElementById('direct-analyze-btn');
    if (directBtn && directInput) {
        const runDirect = () => {
            const username = directInput.value.trim();
            if (username) {
                currentRole = 'aspirant';
                localStorage.setItem('role', 'aspirant');
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                searchSection.style.display = 'none';
                viewFavoritesBtn.style.display = 'none';
                if (roleIndicator) roleIndicator.textContent = 'ASPIRANT';
                analyzeUser(username);
            }
        };
        directBtn.addEventListener('click', runDirect);
        directInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runDirect();
        });
    }

    // Check Authentication on Page Load
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (userStatusBar && loggedInUsernameEl) {
                loggedInUsernameEl.textContent = `@${currentUser.username || currentUser.login}`;
                userStatusBar.style.display = 'block';
            }
        } else {
            currentUser = null;
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userStatusBar) userStatusBar.style.display = 'none';
        }

        // Always show the role selection card so the user selects their role on app.html
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        const savedRole = localStorage.getItem('role') || 'aspirant';
        const matchedRadio = document.querySelector(`input[name="role"][value="${savedRole}"]`);
        if (matchedRadio) matchedRadio.checked = true;
        updateRoleSelectionUI(savedRole);
    } catch (err) {
        console.error('Error checking auth', err);
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        const checked = document.querySelector('input[name="role"]:checked');
        updateRoleSelectionUI(checked ? checked.value : 'aspirant');
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
        hideClusterResults(); // CRITICAL: hide K-Means output when viewing favorites
        favoritesSection.style.display = 'block';
        resultsBox.style.display = 'none';
        favoritesList.innerHTML = '<p>Loading saved candidates...</p>';
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();

            if (data.error) {
                favoritesList.innerHTML = `<p style="color:#f87171">Error loading favorites</p>`;
                return;
            }

            if (data.length === 0) {
                favoritesList.innerHTML = '<p style="color:var(--text-secondary);">No saved candidates yet.</p>';
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
                html += `<h4 style="margin-top: 20px; color: var(--accent-peach); border-bottom: 1px solid var(--border-brown); padding-bottom: 5px;">Drive: ${drive}</h4>`;
                html += candidates.map(c => `
                    <div class="saved-item">
                        <div style="display:flex; align-items:center;">
                            <img src="${c.avatar_url}" style="width:40px; height:40px; border-radius:50%; margin-right:12px; border:1px solid var(--accent-peach);" alt="${c.candidate_username}">
                            <div class="saved-item-info" style="margin-left: 0;">
                                <strong>${c.candidate_name || c.candidate_username}</strong>
                                <div>@${c.candidate_username}</div>
                            </div>
                        </div>
                        <strong style="color:var(--accent-peach);">Score: ${c.score}</strong>
                        <div style="display:flex; gap: 8px;">
                            <button class="btn btn-outline" style="padding: 5px 12px; font-size:12px;" onclick="loadCandidate('${c.candidate_username}')">View</button>
                            <button class="btn" style="padding: 5px 10px; font-size:12px; background: #c62828; color: white;" onclick="deleteCandidate('${c.candidate_username}')">🗑️</button>
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
        hideClusterResults();
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
        commitsList.innerHTML = '<p>Loading commits...</p>';
        try {
            const res = await fetch(`/api/commits/${username}/${repo}`);
            const data = await res.json();
            if (data.error) {
                commitsList.innerHTML = `<p style="color:#f87171">Error: ${data.error}</p>`;
                return;
            }
            if (data.length === 0) {
                commitsList.innerHTML = '<p style="color:var(--text-muted);">No commits found.</p>';
                return;
            }
            commitsList.innerHTML = data.map(c => `
                <div class="commit-item">
                    <p><strong>${c.message.split('\n')[0]}</strong></p>
                    <small style="color:var(--text-secondary);">${new Date(c.date).toLocaleString()} — <a href="${c.url}" target="_blank" style="color:var(--accent-cyan); text-decoration:none;">View on GitHub</a></small>
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
                improveSuggestions.innerHTML = `<p style="color:#34d399;">Your profile is already well-configured! No missing fields detected.</p>`;
                improveSuggestions.style.display = 'block';
                return;
            }

            let html = `<p style="color:var(--text-light-blue); margin-bottom:12px;">We noticed some empty fields on your GitHub. Here's what AI suggests you add:</p><ul style="padding-left:18px;">`;
            for (const [key, val] of Object.entries(currentFixes)) {
                html += `<li style="margin-bottom:10px;"><strong style="color:var(--accent-peach);">${key.toUpperCase()}:</strong> <span style="color:var(--text-white);">${val}</span></li>`;
            }
            html += `</ul>`;

            improveSuggestions.innerHTML = html;
            improveSuggestions.style.display = 'block';
            applyFixesBtn.style.display = 'inline-block';

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
                copyPitchBtn.style.display = 'inline-block';
            }
            pitchTextarea.style.display = 'block';
        } catch (err) {
            pitchLoading.style.display = 'none';
            pitchTextarea.value = `Failed to generate pitch.\nDetails: ${err.message}`;
            pitchTextarea.style.display = 'block';
        }
    };

    async function analyzeUser(username) {
        hideClusterResults(); // CRITICAL: hide previous K-Means output when analyzing profile
        resultsBox.style.display = 'block';
        favoritesSection.style.display = 'none';
        
        // Animated loading circle + required message
        resultsBox.innerHTML = `
            <div class="analyzing-box">
                <div class="spinner-lg"></div>
                <div class="analyzing-text">Analyzing profile, it may take some time...</div>
                <div class="analyzing-sub">Fetching repositories, commit activity &amp; computing engineering metrics...</div>
            </div>
        `;

        if (searchBtn) setBtnLoading(searchBtn, true, 'Analyze Candidate');
        if (directBtn) setBtnLoading(directBtn, true, 'Analyze');

        try {
            const res = await fetch(`/api/analyze/${username}`);
            const data = await res.json();

            if (data.error) {
                resultsBox.innerHTML = `<p style="color:#f87171">Error: ${data.error}</p>`;
                return;
            }

            currentReport = data;
            window.lastReport = data;
            renderResults(data);
        } catch (err) {
            resultsBox.innerHTML = `<p style="color:#f87171">Error fetching data.</p>`;
        } finally {
            if (searchBtn) setBtnLoading(searchBtn, false, 'Analyze Candidate');
            if (directBtn) setBtnLoading(directBtn, false, 'Analyze');
            if (continueSignedInBtn) setBtnLoading(continueSignedInBtn, false);
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
                <button class="btn" style="background: linear-gradient(135deg, #7c3aed, #2563eb); border: none; color: white;" onclick="document.getElementById('cluster-repos-btn').click()">Cluster Repos</button>
                <button id="draft-pitch-btn" class="btn btn-outline" onclick="draftPitch()">✨ AI Draft Pitch</button>
                <button id="save-candidate-btn" class="btn" onclick="saveCandidate()">Save Candidate</button>
               </div>`
            : '';

        let reposHtml = '';
        if (data.repositories && data.repositories.length > 0) {
            reposHtml = `
            <div style="margin-top: 30px;">
                <h4 style="color:var(--accent-peach);">Top Repositories</h4>
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
                            linksHtml += `<span class="repo-badge" style="background:var(--accent-peach); color:var(--bg-dark);">📖 Docs</span>`;
                        }

                        return `
                        <div class="repo-card" onclick="openCommitsModal('${data.username}', '${repo.name}')" style="position:relative;">
                            <h5>${repo.name}</h5>
                            <p>${repo.description ? repo.description.substring(0, 60) + '...' : 'No description'}</p>
                            <div class="stats">
                                <span>⭐ ${repo.stargazers_count}</span>
                                <span>${repo.language || 'Unknown'}</span>
                            </div>
                            <div style="margin-top:10px;">${linksHtml}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        // Clean Contained Box Model Structure (Exact match to previous layout)
        resultsBox.innerHTML = `
            <div class="profile-header">
                <img src="${data.avatar_url}" alt="Avatar">
                <div>
                    <h3 style="margin:0;">${data.name || data.username}</h3>
                    ${data.bio ? `<p style="margin:5px 0 0 0; color:var(--text-secondary);">${data.bio}</p>` : ''}
                </div>
                ${saveBtnHtml}
            </div>

            <div class="score">Total Developer Score: ${s.total} / 100</div>
            
            <div style="display:flex; gap: 40px; margin-bottom: 20px; flex-wrap:wrap;">
                <div style="flex: 1; min-width:280px;">
                    <h4 style="color:var(--accent-peach);">Algorithmic Breakdown</h4>
                    <div style="position: relative; height:250px; width:100%; margin-bottom:20px;">
                        <canvas id="scoreRadarChart"></canvas>
                    </div>
                </div>

                <div style="flex: 1; min-width:280px;">
                    <h4 style="color:var(--accent-peach);">Raw Metrics</h4>
                    <div class="metric"><span>Public Repos:</span> <strong>${data.public_repos}</strong></div>
                    <div class="metric"><span>Total Stars:</span> <strong>${data.total_stars}</strong></div>
                    <div class="metric"><span>Followers:</span> <strong>${data.followers}</strong></div>
                    <div class="metric"><span>Top Languages:</span> <strong>${languagesHtml || 'None'}</strong></div>
                    <br>
                    <h4 style="color:var(--accent-peach);">Classic Scores</h4>
                    <div class="progress-container"><div class="progress-label"><span>Impact</span> <span>${s.impact}/40</span></div><div class="progress-bar"><div class="progress-fill impact" style="width: ${(s.impact / 40) * 100}%;"></div></div></div>
                    <div class="progress-container"><div class="progress-label"><span>Activity</span> <span>${s.activity}/30</span></div><div class="progress-bar"><div class="progress-fill activity" style="width: ${(s.activity / 30) * 100}%;"></div></div></div>
                    <div class="progress-container"><div class="progress-label"><span>Network</span> <span>${s.network}/15</span></div><div class="progress-bar"><div class="progress-fill network" style="width: ${(s.network / 15) * 100}%;"></div></div></div>
                    <div class="progress-container"><div class="progress-label"><span>Profile</span> <span>${s.profile}/15</span></div><div class="progress-bar"><div class="progress-fill profile" style="width: ${(s.profile / 15) * 100}%;"></div></div></div>
                </div>
            </div>
            
            ${reposHtml}

            <div class="ai-summary" style="margin-top: 30px;">
                <h4 style="margin-top:0; color:var(--accent-peach);">${currentRole === 'aspirant' ? 'Personalized Improvement Insights' : 'AI Candidate Summary'}</h4>
                <p style="margin-top: 10px; line-height: 1.6; margin-bottom: 0;">${formattedAiSummary}</p>
            </div>
        `;

        // Render Radar Chart with dark/peach color scheme
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
                    backgroundColor: 'rgba(255, 205, 130, 0.35)',
                    borderColor: '#ffcd82',
                    borderWidth: 2,
                    pointBackgroundColor: '#7bd0ff',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#7bd0ff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#dae2fd', font: { size: 12 } },
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

            clusterBtn.textContent = 'Clustering...';
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
                clusterBtn.textContent = 'Cluster Repos';
                clusterBtn.disabled = false;
            }
        });
    }

    function renderClusters(clusters) {
        const container = document.getElementById('cluster-groups');
        const panel = document.getElementById('cluster-results');
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899'];

        container.innerHTML = '';
        clusters.forEach((cluster, i) => {
            const color = colors[i % colors.length];
            const card = document.createElement('div');
            card.style.cssText = `border:1px solid ${color}44; border-radius:12px; padding:16px; margin-bottom:16px; background:rgba(0,0,0,0.25);`;

            const tags = cluster.repos.map(r =>
                `<span style="background:${color}22; border:1px solid ${color}66; color:${color}; border-radius:999px; padding:3px 12px; font-size:0.8rem; margin:3px; display:inline-block;">${r.name}</span>`
            ).join('');

            card.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:10px;">
                <span style="width:12px; height:12px; border-radius:50%; background:${color}; margin-right:10px;"></span>
                <strong style="font-size:1.1rem; color:#ffefdd;">${cluster.label}</strong>
                <span style="margin-left:auto; font-size:0.8rem; color:#94a3b8;">${cluster.repos.length} repo${cluster.repos.length !== 1 ? 's' : ''}</span>
            </div>
            <div>${tags}</div>`;
            container.appendChild(card);
        });

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
