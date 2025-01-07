const express = require('express');
const session = require('express-session');
require('dotenv').config();
const { poolPromise, sql } = require('../db'); // Import DB connection

const { ConfidentialClientApplication } = require('@azure/msal-node');


const router = express.Router();

const msalConfig = {
    auth: {
        clientId: '644c879b-ba25-4fa0-b161-f76e20d072f8',
        authority: process.env.MY_Auth,
        clientSecret: process.env.MY_SECRET_KEY,
    },
    cache: {
        cacheLocation: 'memory',
    },
};

// Create MSAL client
const msalClient = new ConfidentialClientApplication(msalConfig);

// Session configuration
router.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false, // Set to true in production
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        },
    })
);

// Login route
router.get('/Microsoftlogin', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ['user.read'],
        redirectUri: 'http://localhost:3000/users/Microsoftlogin/callback/',
    };

    msalClient
        .getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => {
            res.redirect(response);
        })
        .catch((error) => {
            console.error('Error getting auth code URL:', error);
            res.status(500).send('Error during login');
        });
});

// Callback route
// Callback route
router.get('/Microsoftlogin/callback', async (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        scopes: ['user.read'],
        redirectUri: 'http://localhost:3000/users/Microsoftlogin/callback/',
    };

    try {
        const response = await msalClient.acquireTokenByCode(tokenRequest);
        console.log('Authentication successful:', response.account);

        const email = response.account.username;
        const name = response.account.name
        const accessToken = response.accessToken;

        req.session.user = {
            name,
            email,
            accessToken,
        };

        try {
            const pool = await poolPromise;

            // Check if the user already exists in the database
            const userCheck = await pool.request()
                .input('email', sql.NVarChar, email)
                .query('SELECT * FROM Users WHERE email = @email');

            if (!userCheck.recordset.length) {
                // Create new user if not found, leaving password empty
                const result = await pool.request()
                    .input('name', sql.NVarChar, name)
                    .input('email', sql.NVarChar, email)
                    .input('password', sql.NVarChar, 'password')
                    .query('INSERT INTO Users (name, email, password) OUTPUT INSERTED.id VALUES (@name, @email, @password)');

                res.status(201).json({ message: 'User created successfully', userId: result.recordset[0].id });
            }

            req.session.user = { email, name, accessToken };
        } catch (err) {
            console.error('Error during user login:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }

        res.redirect('https://flutter-widget-hub-2f91d.web.app'); // Redirect to a secure page
    } catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).send('Error during callback');
    }
});

router.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.status(200).json({
            isloggedIn: true,
            message: 'User is logged in',
            user: req.session.user,
        });
    } else {
        res.status(401).json({
            isloggedIn: false,
            message: 'User is not logged in',
        });
    }
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to log out' });
        }

        const logoutUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=http://localhost:3000/`;
        res.redirect(logoutUrl);
    });
});


// CREATE User
router.post('/create', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const pool = await connect(); // Get the database connection pool

        // Check if email exists
        const emailCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT COUNT(*) AS count FROM Users WHERE email = @email');

        if (emailCheck.recordset[0].count > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Insert user into database
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query('INSERT INTO Users (name, email, password) OUTPUT INSERTED.id VALUES (@name, @email, @password)');

        res.status(201).json({ message: 'User created successfully', userId: result.recordset[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await poolPromise;

        // Check if the email exists in the database
        const userCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        if (!userCheck.recordset.length) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = userCheck.recordset[0];

        // Check if the password matches (you should use a hashed password in production)
        if (user.password !== password) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Store the user in session (you can use a session middleware like express-session)
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
        };

        // Return the user info and session data
        res.status(200).json({
            message: 'Login successful',
            user: { id: user.id, name: user.name, email: user.email },
            sessionId: req.sessionID, // Include session ID
        });
    } catch (err) {
        console.error('Error during signin:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// READ Users
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const rows = await pool.request().query('SELECT * FROM Users');
        if (rows && rows.recordset.length > 0) {
            res.status(200).json(rows.recordset);
        } else {
            res.status(404).json({ error: 'No users found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE User
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query('UPDATE Users SET name = @name, email = @email, password = @password WHERE id = @id');

        if (result && result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'User updated successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE User
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Users WHERE id = @id');

        if (result && result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;