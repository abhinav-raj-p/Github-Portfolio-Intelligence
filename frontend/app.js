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

    // Save role on selection change
    const roleRadios = document.querySelectorAll('input[name="role"]');
    roleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            localStorage.setItem('role', e.target.value);
        });
    });

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

            favoritesList.innerHTML = data.map(candidate => `
                <div class="saved-item">
                    <div style="display:flex; align-items:center;">
                        <img src="${candidate.avatar_url}" alt="${candidate.candidate_username}">
                        <div class="saved-item-info">
                            <strong>${candidate.candidate_name || candidate.candidate_username}</strong>
                            <div>@${candidate.candidate_username}</div>
                        </div>
                    </div>
                    <strong>Score: ${candidate.score}</strong>
                    <button class="btn btn-outline" onclick="loadCandidate('${candidate.candidate_username}')">View</button>
                </div>
            `).join('');
        } catch (err) {
            favoritesList.innerHTML = `<p style="color:red">Error loading favorites.</p>`;
        }
    });

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
                    <p><strong>${c.message.split('\\n')[0]}</strong></p>
                    <small>${new Date(c.date).toLocaleString()} - <a href="${c.url}" target="_blank" style="color:var(--text-light-blue)">View on GitHub</a></small>
                </div>
            `).join('');
        } catch (err) {
            commitsList.innerHTML = `<p style="color:red">Failed to load commits.</p>`;
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
            renderResults(data);
        } catch (err) {
            resultsBox.innerHTML = `<p style="color:red">Error fetching data.</p>`;
        }
    }

    window.saveCandidate = async () => {
        if (!currentReport) return;
        const btn = document.getElementById('save-candidate-btn');
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
                    name: currentReport.name
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
            ? `<button id="save-candidate-btn" class="btn" style="margin-left:auto;" onclick="saveCandidate()">Save Candidate</button>`
            : '';

        let reposHtml = '';
        if (data.repositories && data.repositories.length > 0) {
            reposHtml = `
            <div style="margin-top: 30px;">
                <h4 style="color:var(--accent-peach);">Top Repositories</h4>
                <div class="repos-grid">
                    ${data.repositories.map(repo => `
                        <div class="repo-card" onclick="openCommitsModal('${data.username}', '${repo.name}')">
                            <h5>${repo.name}</h5>
                            <p>${repo.description ? repo.description.substring(0, 60) + '...' : 'No description'}</p>
                            <div class="stats">
                                <span>⭐ ${repo.stargazers_count}</span>
                                <span>${repo.language || 'Unknown'}</span>
                            </div>
                        </div>
                    `).join('')}
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
                    <div class="progress-container">
                        <div class="progress-label"><span>Impact (Stars, Forks)</span> <span>${s.impact} / 40</span></div>
                        <div class="progress-bar"><div class="progress-fill impact" style="width: ${(s.impact / 40) * 100}%;"></div></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label"><span>Activity (Repos, Recency)</span> <span>${s.activity} / 30</span></div>
                        <div class="progress-bar"><div class="progress-fill activity" style="width: ${(s.activity / 30) * 100}%;"></div></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label"><span>Network (Followers)</span> <span>${s.network} / 15</span></div>
                        <div class="progress-bar"><div class="progress-fill network" style="width: ${(s.network / 15) * 100}%;"></div></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label"><span>Profile Completeness</span> <span>${s.profile} / 15</span></div>
                        <div class="progress-bar"><div class="progress-fill profile" style="width: ${(s.profile / 15) * 100}%;"></div></div>
                    </div>
                </div>

                <div style="flex: 1;">
                    <h4 style="color:var(--accent-peach);">Raw Metrics</h4>
                    <div class="metric"><span>Public Repos:</span> <strong>${data.public_repos}</strong></div>
                    <div class="metric"><span>Total Stars:</span> <strong>${data.total_stars}</strong></div>
                    <div class="metric"><span>Followers:</span> <strong>${data.followers}</strong></div>
                    <div class="metric"><span>Top Languages:</span> <strong>${languagesHtml || 'None'}</strong></div>
                </div>
            </div>
            
            ${reposHtml}

            <div class="ai-summary" style="margin-top: 30px;">
                <h4 style="margin-top:0; color:var(--accent-peach);">${currentRole === 'aspirant' ? 'Personalized Improvement Insights' : 'AI Candidate Summary'}</h4>
                <p style="margin-top: 10px; line-height: 1.6; margin-bottom: 0;">${formattedAiSummary}</p>
            </div>
        `;
    }
});
