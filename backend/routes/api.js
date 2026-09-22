const express = require('express');
const axios = require('axios');
const router = express.Router();
const { supabase } = require('../services/supabase');

// Configure API endpoint to analyze a GitHub user
router.get('/analyze/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const authHeader = req.isAuthenticated() ? { Authorization: `token ${req.user.accessToken}` } : {};

        // Fetch user data
        const userResp = await axios.get(`https://api.github.com/users/${username}`, { headers: authHeader });
        const reposResp = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: authHeader });

        const userData = userResp.data;
        const reposData = reposResp.data;

        // Calculate simple metrics for languages
        let languageCounts = {};
        let totalStars = 0;
        let totalForks = 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let recentReposCount = 0;

        for (let repo of reposData) {
            totalStars += repo.stargazers_count;
            totalForks += repo.forks_count;
            if (repo.language) {
                languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
            }
            if (new Date(repo.updated_at) > thirtyDaysAgo) {
                recentReposCount++;
            }
        }

        // --- Algorithmic Scoring ---
        // S_impact (Max 40)
        let s_impact = Math.min(40, (totalStars * 1) + (totalForks * 2));

        // S_activity (Max 30)
        let publicReposCount = userData.public_repos || reposData.length;
        let s_activity = Math.min(30, (publicReposCount * 0.5) + (recentReposCount * 2));

        // S_network (Max 15)
        let followers = userData.followers || 0;
        let s_network = Math.min(15, followers * 1.5);

        // S_profile (Max 15)
        let s_profile = 0;
        if (userData.bio) s_profile += 3;
        if (userData.location) s_profile += 3;
        if (userData.blog) s_profile += 3;
        if (userData.company) s_profile += 3;
        if (userData.email) s_profile += 3;

        // Total score calculation
        let score = Math.floor(s_impact + s_activity + s_network + s_profile);

        const scoreBreakdown = {
            impact: s_impact,
            activity: s_activity,
            network: s_network,
            profile: s_profile,
            total: score
        };

        // Simulated AI Summary if no API key
        let aiSummary = `${userData.name || username} has a total developer score of ${score}/100 based on their GitHub footprint.\nImpact score: ${s_impact}/40\nActivity score: ${s_activity}/30\nNetwork score: ${s_network}/15\nProfile score: ${s_profile}/15`;

        if (process.env.OPENAI_API_KEY) {
            try {
                const prompt = `You are a professional assistant helping evaluate developers' GitHub portfolios.
The developer ${userData.name || username} has a score of ${score}/100.
Breakdown: Impact ${s_impact}/40, Activity ${s_activity}/30, Network ${s_network}/15, Profile Completeness ${s_profile}/15.
Identify their strengths and give 2 clear, actionable recommendations on how to improve their lower sub-scores based strictly on this breakdown. Format as 1 short paragraph summary, followed by 2 bullet points for recommendations.`;

                const openaiResp = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: "gpt-3.5-turbo",
                    messages: [{ "role": "user", "content": prompt }]
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
                });
                aiSummary = openaiResp.data.choices[0].message.content;
            } catch (aiErr) {
                console.error("OpenAI Error:", aiErr.message);
            }
        }

        const topRepos = reposData.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10).map(repo => ({
            name: repo.name,
            description: repo.description,
            stargazers_count: repo.stargazers_count,
            language: repo.language,
            updated_at: repo.updated_at
        }));

        const report = {
            username: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
            bio: userData.bio,
            public_repos: publicReposCount,
            followers: followers,
            total_stars: totalStars,
            top_languages: languageCounts,
            scores: scoreBreakdown,
            aiSummary: aiSummary,
            repositories: topRepos
        };

        res.json(report);
    } catch (error) {
        console.error("Analysis error: ", error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});

// Save a favorite candidate (for recruiters)
router.post('/favorites', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured." });

    const { username, score, avatar_url, name } = req.body;

    try {
        const { data, error } = await supabase
            .from('favorites')
            .insert([{ candidate_username: username, score, avatar_url, candidate_name: name }]);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error("Supabase insert error", err);
        res.status(500).json({ error: err.message });
    }
});

// Get favorites
router.get('/favorites', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured." });

    try {
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Supabase get error", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// Get commits for a repo
router.get('/commits/:username/:repo', async (req, res) => {
    try {
        const { username, repo } = req.params;
        const authHeader = req.isAuthenticated() ? { Authorization: `token ${req.user.accessToken}` } : {};

        const commitsResp = await axios.get(`https://api.github.com/repos/${username}/${repo}/commits?per_page=10`, { headers: authHeader });
        const commits = commitsResp.data.map(c => ({
            sha: c.sha,
            message: c.commit.message,
            date: c.commit.author.date,
            url: c.html_url
        }));

        res.json(commits);
    } catch (err) {
        console.error("Commits fetch error", err.message);
        res.status(500).json({ error: "Could not fetch commits." });
    }
});
