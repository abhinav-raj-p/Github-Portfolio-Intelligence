const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const router = express.Router();
const dotenv = require('dotenv');

dotenv.config();

let callbackURL = "http://localhost:3000/auth/github/callback";
if (process.env.NODE_ENV === 'production') {
    // Fallback to the Vercel app URL if BASE_URL is not set in Vercel environment variables
    const baseUrl = process.env.BASE_URL || "https://gitview-sooty.vercel.app";
    callbackURL = baseUrl + "/auth/github/callback";
}

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: callbackURL
    },
        function (accessToken, refreshToken, profile, done) {
            // Include accessToken for API calls
            profile.accessToken = accessToken;
            return done(null, profile);
        }
    ));
} else {
    console.warn("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set. GitHub auth will fail.");
}

router.get('/github',
    passport.authenticate('github', { scope: ['user'] }));

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    function (req, res) {
        // Successful authentication, redirect to dashboard.
        res.redirect('/app.html');
    });

router.get('/check', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

module.exports = router;
