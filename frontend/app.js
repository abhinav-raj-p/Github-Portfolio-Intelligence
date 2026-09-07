document.addEventListener('DOMContentLoaded', async () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const searchSection = document.getElementById('search-section');
    const resultsBox = document.getElementById('results');
    const searchBtn = document.getElementById('search-btn');
    const candidateInput = document.getElementById('candidate-username');

    // Check Authentication
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();

        if (data.authenticated) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';

            // Check selected role from localStorage or default to aspirant
            const role = localStorage.getItem('role') || 'aspirant';

            if (role === 'recruiter') {
                searchSection.style.display = 'block';
            } else {
                searchSection.style.display = 'none';
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

    async function analyzeUser(username) {
        resultsBox.innerHTML = '<p>Analyzing profile...</p>';
        try {
            const res = await fetch(`/api/analyze/${username}`);
            const data = await res.json();

            if (data.error) {
                resultsBox.innerHTML = `<p style="color:red">Error: ${data.error}</p>`;
                return;
            }

            renderResults(data);
        } catch (err) {
            resultsBox.innerHTML = `<p style="color:red">Error fetching data.</p>`;
        }
    }

    function renderResults(data) {
        let languagesHtml = Object.entries(data.top_languages || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lang, count]) => `${lang} (${count})`)
            .join(', ');

        resultsBox.innerHTML = `
            <h3>${data.name || data.username}'s Portfolio</h3>
            <img src="${data.avatar_url}" alt="Avatar" width="100" style="border-radius:50%; margin-bottom:15px;">
            <p>${data.bio ? '"' + data.bio + '"' : ''}</p>
            <div class="score">Score: ${data.score} / 100</div>
            <div class="metric"><span>Public Repos:</span> <span>${data.public_repos}</span></div>
            <div class="metric"><span>Total Stars:</span> <span>${data.total_stars}</span></div>
            <div class="metric"><span>Followers:</span> <span>${data.followers}</span></div>
            <div class="metric"><span>Top Languages:</span> <span>${languagesHtml || 'None'}</span></div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e1f0fa; border-left: 4px solid #0366d6; border-radius: 4px;">
                <strong>AI Summary:</strong>
                <p style="margin-top: 10px; line-height: 1.5;">${data.aiSummary}</p>
            </div>
        `;
    }
});
