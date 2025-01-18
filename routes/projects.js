const express = require('express');
const { poolPromise, sql } = require('../db');
const router = express.Router();

// GET all projects of a specific user
router.get('/:user_id/projects', async (req, res) => {
    const { user_id } = req.params;

    try {
        const pool = await poolPromise;

        const query = `
            SELECT 
                id AS projectId, 
                name AS projectName, 
                style AS projectStyle
            FROM Projects
            WHERE user_id = @user_id;
        `;

        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .query(query);

        const projects = result.recordset;

        res.status(200).json(projects);
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// CREATE Project
router.post('/', async (req, res) => {
    const { user_id, name, style } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('name', sql.NVarChar, name)
            .input('style', sql.NVarChar, style)
            .query('INSERT INTO Projects (user_id, name, style) OUTPUT INSERTED.id VALUES (@user_id, @name, @style)');

        res.status(201).json({ message: 'Project created successfully', projectId: result.recordset[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ Projects
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const rows = await pool.request().query('SELECT id, name, style FROM Projects');
        if (rows && rows.recordset.length > 0) {
            res.status(200).json(rows.recordset);
        } else {
            res.status(404).json({ error: 'No projects found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Project
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id, name, style } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, user_id)
            .input('name', sql.NVarChar, name)
            .input('style', sql.NVarChar, style)
            .query('UPDATE Projects SET user_id = @user_id, name = @name, style = @style WHERE id = @id');

        if (result && result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'Project updated successfully' });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Project
// DELETE Project
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;

        // Start transaction
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            // Delete widgets associated with the project
            await transaction.request()
                .input('project_id', sql.Int, id)
                .query('DELETE FROM Widgets WHERE project_id = @project_id');

            // Delete the project
            const result = await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Projects WHERE id = @id');

            if (result && result.rowsAffected[0] > 0) {
                await transaction.commit();
                res.status(200).json({ message: 'Project and associated widgets deleted successfully' });
            } else {
                await transaction.rollback();
                res.status(404).json({ error: 'Project not found' });
            }
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
