const express = require('express');
const { poolPromise, sql } = require('../db');
const router = express.Router();


router.post('/', async (req, res) => {
    const { user_id, name, style, color } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('name', sql.NVarChar, name)
            .input('style', sql.NVarChar, style)
            .input('color', sql.NVarChar, color)
            .query('INSERT INTO Projects (user_id, name, style, color) OUTPUT INSERTED.id VALUES (@user_id, @name, @style, @color)');

        res.status(201).json({ message: 'Project created successfully', projectId: result.recordset[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// READ Projects
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const rows = await pool.request().query('SELECT * FROM Projects');
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
    const { user_id, name, style, color } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, user_id)
            .input('name', sql.NVarChar, name)
            .input('style', sql.NVarChar, style)
            .input('color', sql.NVarChar, color)
            .query('UPDATE Projects SET user_id = @user_id, name = @name, style = @style, color = @color WHERE id = @id');

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
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Projects WHERE id = @id');

        if (result && result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'Project deleted successfully' });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
