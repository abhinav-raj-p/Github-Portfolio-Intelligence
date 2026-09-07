const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('../services/firebase');

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

        // Calculate simple metrics
        const totalStars = reposData.reduce((acc, repo) => acc + repo.stargazers_count, 0);
        const totalForks = reposData.reduce((acc, repo) => acc + repo.forks_count, 0);

        let languageCounts = {};
        for (let repo of reposData) {
            if (repo.language) {
                languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
            }
        }

        // Simple scoring out of 100
        let score = Math.min(100, Math.floor((totalStars * 2) + (reposData.length * 0.5) + (totalForks * 1)));

        // Simulated AI Summary (To avoid hard dependency if OpenAI key is missing)
        let aiSummary = `${userData.name || username} is an active developer specializing in ${Object.keys(languageCounts).slice(0, 3).join(', ')}. They have built ${reposData.length} projects amassing ${totalStars} stars.`;

        if (process.env.OPENAI_API_KEY) {
            try {
                const openaiResp = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: "gpt-3.5-turbo",
                    messages: [{ "role": "user", "content": `Write a 2 sentence professional performance summary of a developer with ${reposData.length} repos, ${totalStars} total stars, whose top languages are ${Object.keys(languageCounts).join(', ')}.` }]
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
                });
                aiSummary = openaiResp.data.choices[0].message.content;
            } catch (aiErr) {
                console.error("OpenAI Error:", aiErr.message);
            }
        }

        const report = {
            username: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
            bio: userData.bio,
            public_repos: userData.public_repos,
            followers: userData.followers,
            total_stars: totalStars,
            top_languages: languageCounts,
            score: score,
            aiSummary: aiSummary
        };

        // Optionally save to Firebase
        if (db && process.env.FIREBASE_PROJECT_ID) {
            await db.collection('reports').doc(username).set(report);
        }

        res.json(report);
    } catch (error) {
        console.error("Analysis error: ", error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
