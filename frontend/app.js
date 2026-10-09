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

    let currentRole = 'aspirant';
    let currentReport = null; // store current fetched report
    let currentFixes = null; // store AI generated fixes
    let radarChartInstance = null; // Chart.js instance tracking

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

    // Check Authentication
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();

        if (data.authenticated) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';

            currentRole = localStorage.getItem('role') || 'aspirant';

            if (currentRole === 'recruiter') {
                searchSection.style.display = 'block';
                viewFavoritesBtn.style.display = 'inline-block';
            } else {
                searchSection.style.display = 'none';
                viewFavoritesBtn.style.display = 'none';
                analyzeUser(data.user.username || data.user.login);
            }
        }
    } catch (err) {
        console.error('Error checking auth', err);
    }

    // Button elements
    const loginLink = document.querySelector('a[href="/auth/github"]');
    const recruiterBypassBtn = document.getElementById('recruiter-bypass-btn');
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const backHomeBtn = document.getElementById('back-home-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginLink) {
        loginLink.addEventListener('click', () => {
            const selected = document.querySelector('input[name="role"]:checked');
            if (selected) localStorage.setItem('role', selected.value);
        });
    }

    roleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'recruiter' && recruiterBypassBtn) {
                recruiterBypassBtn.style.display = 'block';
                loginLink.style.display = 'none'; // Only allow bypass or login? User might want to login as recruiter too, so we keep both!
                loginLink.style.display = 'inline-block';
            } else if (recruiterBypassBtn) {
                recruiterBypassBtn.style.display = 'none';
                loginLink.style.display = 'inline-block';
            }
        });
    });

    // Check if initial load requires button show
    const checkedRadio = document.querySelector('input[name="role"]:checked');
    if (checkedRadio && checkedRadio.value === 'recruiter' && recruiterBypassBtn) {
        recruiterBypassBtn.style.display = 'block';
    }

    if (recruiterBypassBtn) {
        recruiterBypassBtn.addEventListener('click', () => {
            localStorage.setItem('role', 'recruiter');
            currentRole = 'recruiter';
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            searchSection.style.display = 'block';
            viewFavoritesBtn.style.display = 'inline-block';
            if (document.getElementById('aspirant-actions')) {
                document.getElementById('aspirant-actions').style.display = 'none';
            }
        });
    }

    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            dashboardSection.style.display = 'none';
            loginSection.style.display = 'block';
            resultsBox.style.display = 'none';
            favoritesSection.style.display = 'none';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
        });
    }

    // Search button click
    searchBtn.addEventListener('click', () => {
        const username = candidateInput.value.trim();
        if (username) analyzeUser(username);
    });

    // Favorites Logic
    viewFavoritesBtn.addEventListener('click', async () => {
        favoritesSection.style.display = 'block';
        resultsBox.style.display = 'none';
        favoritesList.innerHTML = '<p>Loading...</p>';
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();

            if (data.error) {
                favoritesList.innerHTML = `<p style="color:red">Error loading favorites</p>`;
                return;
            }

            if (data.length === 0) {
                favoritesList.innerHTML = '<p>No saved candidates yet.</p>';
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
                            <img src="${c.avatar_url}" style="width:40px; height:40px; border-radius:50%; margin-right:10px;" alt="${c.candidate_username}">
                            <div class="saved-item-info" style="margin-left: 0;">
                                <strong>${c.candidate_name || c.candidate_username}</strong>
                                <div>@${c.candidate_username}</div>
                            </div>
                        </div>
                        <strong>Score: ${c.score}</strong>
                        <div style="display:flex; gap: 10px;">
                            <button class="btn btn-outline" style="padding: 5px 10px;" onclick="loadCandidate('${c.candidate_username}')">View</button>
                            <button class="btn" style="padding: 5px 10px; background: #c62828; color: white;" onclick="deleteCandidate('${c.candidate_username}')">🗑️</button>
                        </div>
                    </div>
                `).join('');
            }
            favoritesList.innerHTML = html;
        } catch (err) {
            favoritesList.innerHTML = `<p style="color:red">Error loading favorites.</p>`;
        }
    });

    window.deleteCandidate = async (username) => {
        if (!confirm(`Are you sure you want to remove ${username} from your saved candidates?`)) return;
        try {
            const res = await fetch(`/api/favorites/${username}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                document.getElementById('view-favorites-btn').click(); // Refresh list
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
        analyzeUser(username);
    };

    closeFavoritesBtn.addEventListener('click', () => {
        favoritesSection.style.display = 'none';
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
                commitsList.innerHTML = `<p style="color:red">Error: ${data.error}</p>`;
                return;
            }
            if (data.length === 0) {
                commitsList.innerHTML = '<p>No commits found.</p>';
                return;
            }
            commitsList.innerHTML = data.map(c => `
                <div class="commit-item">
                    <p><strong>${c.message.split('\n')[0]}</strong></p>
                    <small>${new Date(c.date).toLocaleString()} - <a href="${c.url}" target="_blank" style="color:var(--text-light-blue)">View on GitHub</a></small>
                </div>
            `).join('');
        } catch (err) {
            commitsList.innerHTML = `<p style="color:red">Failed to load commits.</p>`;
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
                improveSuggestions.innerHTML = `<p style="color:red">Error: ${data.error}</p>`;
                improveSuggestions.style.display = 'block';
                return;
            }

            currentFixes = data.suggestions;

            if (Object.keys(currentFixes).length === 0) {
                improveSuggestions.innerHTML = `<p>Your profile is already perfect! No missing fields detected.</p>`;
                improveSuggestions.style.display = 'block';
                return;
            }

            let html = `<p>We noticed some empty fields on your GitHub. Here's what our AI suggests you add:</p><ul>`;
            for (const [key, val] of Object.entries(currentFixes)) {
                html += `<li style="margin-bottom:10px;"><strong>${key.toUpperCase()}:</strong> ${val}</li>`;
            }
            html += `</ul>`;

            improveSuggestions.innerHTML = html;
            improveSuggestions.style.display = 'block';
            applyFixesBtn.style.display = 'block';

        } catch (err) {
            improveLoading.style.display = 'none';
            improveSuggestions.innerHTML = `<p style="color:red">Failed to fetch AI suggestions.</p>`;
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
                    // Re-analyze to pull their new scores
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

    closePitchModal.addEventListener('click', () => pitchModal.style.display = 'none');

    copyPitchBtn.addEventListener('click', () => {
        pitchTextarea.select();
        document.execCommand('copy');
        copyPitchBtn.innerText = 'Copied!';
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
                // If it's 404, it means the server wasn't restarted
                const errText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errText.substring(0, 50)}...`);
            }

            const data = await res.json();
            pitchLoading.style.display = 'none';
            if (data.error) {
                pitchTextarea.value = 'Error generating pitch: ' + data.error;
            } else {
                pitchTextarea.value = data.emailText;
                copyPitchBtn.style.display = 'block';
            }
            pitchTextarea.style.display = 'block';
        } catch (err) {
            pitchLoading.style.display = 'none';
            pitchTextarea.value = `Failed to generate pitch. \nDetails: ${err.message}\n\nDid you restart the Node.js server after the recent backend changes?`;
            pitchTextarea.style.display = 'block';
        }
    };

    async function analyzeUser(username) {
        resultsBox.style.display = 'block';
        favoritesSection.style.display = 'none';
        resultsBox.innerHTML = '<p>Analyzing profile... This may take a few seconds to run the algorithm.</p>';

        try {
            const res = await fetch(`/api/analyze/${username}`);
            const data = await res.json();

            if (data.error) {
                resultsBox.innerHTML = `<p style="color:red">Error: ${data.error}</p>`;
                return;
            }

            currentReport = data;
            window.lastReport = data; // expose for cluster feature
            renderResults(data);
        } catch (err) {
            resultsBox.innerHTML = `<p style="color:red">Error fetching data.</p>`;
        }
    }

    window.saveCandidate = async () => {
        if (!currentReport) return;
        const btn = document.getElementById('save-candidate-btn');

        const driveName = prompt("Enter Recruitment Drive (leave blank for General):");
        if (driveName === null) return; // Cancelled

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
        // The backend returns markdown or plain text with newlines for AI summary. 
        // We'll roughly parse newlines into <br> and bold common markdown headers.
        const formattedAiSummary = (data.aiSummary || '')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        let saveBtnHtml = currentRole === 'recruiter'
            ? `<div style="margin-left:auto; display:flex; gap:10px;">
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
            
            <div style="display:flex; gap: 40px; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <h4 style="color:var(--accent-peach);">Algorithmic Breakdown</h4>
                    <div style="position: relative; height:250px; width:100%; margin-bottom:20px;">
                        <canvas id="scoreRadarChart"></canvas>
                    </div>
                </div>

                <div style="flex: 1;">
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

        // Render Radar Chart
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
                    backgroundColor: 'rgba(255, 205, 130, 0.4)', // Peach transparent
                    borderColor: '#FFCD82',
                    pointBackgroundColor: '#ADDBFF',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#ADDBFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#ADDBFF', font: { size: 12 } },
                        ticks: { display: false, min: 0, max: 100 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // Handle aspirant-specific view visibility
        if (currentRole === 'aspirant') {
            aspirantActions.style.display = 'block';
        } else {
            aspirantActions.style.display = 'none';
        }
    }
});
