const express = require('express');
const axios = require('axios');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { scoreDeveloper } = require('../utils/scoring');
const { preprocessData, calculateTfIdf } = require('../../algorithms/repo-clustering/nlp');
const { kMeansClustering } = require('../../algorithms/repo-clustering/kmeans');

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

        let publicReposCount = userData.public_repos || reposData.length;
        let followers = userData.followers || 0;

        // --- Advanced Algorithmic Scoring ---
        const scoreBreakdown = scoreDeveloper({
            totalStars,
            totalForks,
            recentReposCount,
            publicReposCount,
            followers,
            bio: userData.bio,
            location: userData.location,
            blog: userData.blog,
            company: userData.company,
            email: userData.email
        });

        let score = scoreBreakdown.total;
        let s_impact = scoreBreakdown.impact;
        let s_activity = scoreBreakdown.activity;
        let s_network = scoreBreakdown.network;
        let s_profile = scoreBreakdown.profile;

        // Simulated AI Summary if no API key
        let aiSummary = `${userData.name || username} has a total developer score of ${score}/100 based on their GitHub footprint.\nImpact score: ${s_impact}/40\nActivity score: ${s_activity}/30\nNetwork score: ${s_network}/15\nProfile score: ${s_profile}/15`;

        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are a professional assistant helping evaluate developers' GitHub portfolios.
The developer ${userData.name || username} has a score of ${score}/100.
Breakdown: Impact ${s_impact}/40, Activity ${s_activity}/30, Network ${s_network}/15, Profile Completeness ${s_profile}/15.
Identify their strengths and give 2 clear, actionable recommendations on how to improve their lower sub-scores based strictly on this breakdown. Format as 1 short paragraph summary, followed by 2 bullet points for recommendations.`;

                const geminiResp = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    contents: [{ parts: [{ text: prompt }] }]
                });
                aiSummary = geminiResp.data.candidates[0].content.parts[0].text;
            } catch (aiErr) {
                console.error("Gemini Error:", aiErr.response?.data || aiErr.message);
            }
        }

        // Only deeply scan the top 5 repos to avoid extreme API rate limits
        const top5Repos = reposData.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);

        const enrichedRepos = await Promise.all(top5Repos.map(async repo => {
            let apkUrl = null;
            let hasReadme = false;
            try {
                // Try to find an APK release
                const relResp = await axios.get(`https://api.github.com/repos/${username}/${repo.name}/releases/latest`, { headers: authHeader });
                const assets = relResp.data.assets || [];
                const apkAsset = assets.find(a => a.name.endsWith('.apk'));
                if (apkAsset) apkUrl = apkAsset.browser_download_url;
            } catch (e) { } // Ignore 404s for no releases

            try {
                // Check if README exists to bump documentation score visually
                await axios.head(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers: authHeader });
                hasReadme = true;
            } catch (e) { }

            return {
                name: repo.name,
                description: repo.description,
                stargazers_count: repo.stargazers_count,
                language: repo.language,
                updated_at: repo.updated_at,
                homepage: repo.homepage || null, // Check for live links
                apkUrl: apkUrl,
                hasReadme: hasReadme
            };
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
            repositories: enrichedRepos,
            // All repos (lightweight) for clustering
            all_repositories: reposData.map(r => ({
                name: r.name,
                description: r.description || '',
                topics: r.topics || [],
                language: r.language || null
            }))
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

    const { username, score, avatar_url, name, drive_name } = req.body;
    const drive = drive_name || 'General';

    try {
        const { data, error } = await supabase
            .from('favorites')
            .insert([{ candidate_username: username, score, avatar_url, candidate_name: name, drive_name: drive }]);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error("Supabase insert error", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a favorite candidate
router.delete('/favorites/:username', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured." });

    try {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('candidate_username', req.params.username);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("Supabase delete error", err);
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

// Suggest profile fixes
router.get('/suggest-fixes', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const userResp = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${req.user.accessToken}` }
        });
        const profile = userResp.data;

        // Fetch top languages to suggest a better bio
        const reposResp = await axios.get(`https://api.github.com/user/repos?per_page=50`, {
            headers: { Authorization: `token ${req.user.accessToken}` }
        });
        let languages = new Set();
        reposResp.data.forEach(r => { if (r.language) languages.add(r.language); });
        const langList = Array.from(languages).join(', ') || 'various technologies';

        let suggestions = {};
        if (!profile.bio) {
            if (process.env.GEMINI_API_KEY) {
                try {
                    const prompt = `Write a short, professional GitHub bio (max 160 characters) for a software developer specializing in ${langList}. Return ONLY the bio text without quotes.`;
                    const geminiResp = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                        contents: [{ parts: [{ text: prompt }] }]
                    });
                    suggestions.bio = geminiResp.data.candidates[0].content.parts[0].text.replace(/[\"']/g, '');
                } catch (aiErr) {
                    console.error("Gemini Error:", aiErr.response?.data || aiErr.message);
                    // Fallback to template bio
                    suggestions.bio = `Software developer specializing in ${langList}. Building great things on GitHub.`;
                }
            } else {
                // No Gemini key — use a template bio
                suggestions.bio = `Software developer specializing in ${langList}. Building great things on GitHub.`;
            }
        }
        if (!profile.location) {
            suggestions.location = "Earth";
        }
        if (!profile.blog) {
            suggestions.blog = "https://github.com/" + profile.login;
        }

        res.json({ suggestions, raw: profile });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to generate suggestions." });
    }
});

// Apply profile fixes
router.post('/apply-fixes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    try {
        const updates = req.body; // e.g. { bio: "...", location: "..." }
        const patchResp = await axios.patch('https://api.github.com/user', updates, {
            headers: {
                Authorization: `token ${req.user.accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        res.json({ success: true, profile: patchResp.data });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to update GitHub profile." });
    }
});

// Draft pitch for recruiter
router.post('/draft-pitch', async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key missing." });
    }
    try {
        const candidate = req.body;
        const topLanguages = Object.keys(candidate.top_languages || {}).slice(0, 3).join(', ');

        const prompt = `Write a personalized, professional, and exciting 3-paragraph recruitment outreach email to ${candidate.name || candidate.username}. 
Mention their top skills: ${topLanguages}, and subtly compliment their objective developer algorithm score of ${candidate.scores.total}/100. 
Make the pitch engaging for a SaaS company. Do not use generic subject lines. Provide the raw text for the email, use [insert company] tokens for things the recruiter usually fills.`;

        const geminiResp = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        res.json({ emailText: geminiResp.data.candidates[0].content.parts[0].text });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to generate AI pitch draft." });
    }
});

// Cluster a user's repositories using TF-IDF + K-Means
router.post('/cluster', (req, res) => {
    try {
        const repos = req.body.repos; // [{ name, description, topics, language }]

        if (!repos || repos.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 repositories to cluster.' });
        }

        // Decide k: use 3 clusters or fewer if there aren't many repos
        const k = Math.min(3, repos.length);

        // NLP → TF-IDF → K-Means
        const tokenized = preprocessData(repos);
        const { vectors } = calculateTfIdf(tokenized);
        const clusterIndices = kMeansClustering(vectors, k); // array of k arrays of repo-indices

        // Build labelled cluster objects
        const clusters = clusterIndices.map((indices, i) => {
            const members = indices.map(idx => repos[idx]);

            // Pick a label based on most-common language in the cluster
            const langCount = {};
            members.forEach(r => {
                if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
            });
            const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
            const label = topLang ? `${topLang[0]} Projects` : `Cluster ${i + 1}`;

            return { label, repos: members };
        }).filter(c => c.repos.length > 0); // drop any empty clusters

        res.json({ clusters });
    } catch (err) {
        console.error('Clustering error:', err.message);
        res.status(500).json({ error: 'Clustering failed.' });
    }
});

module.exports = router;

