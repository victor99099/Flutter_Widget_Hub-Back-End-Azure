const express = require('express');
const { poolPromise, sql } = require('../db');
const router = express.Router();


// CREATE Widget
router.post('/', async (req, res) => {
    const { project_id, name, code, style } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('project_id', sql.Int, project_id)
            .input('name', sql.NVarChar, name)
            .input('code', sql.NVarChar, code)
            .input('style', sql.NVarChar, style)
            .query('INSERT INTO Widgets (project_id, name, code, style) OUTPUT INSERTED.id VALUES (@project_id, @name, @code, @style)');

        if (result && result.recordset.length > 0) {
            res.status(201).json({ message: 'Widget created successfully', widgetId: result.recordset[0].id });
        } else {
            res.status(400).json({ error: 'Widget creation failed' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ Widgets
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const rows = await pool.request().query('SELECT * FROM Widgets');
        if (rows && rows.recordset.length > 0) {
            res.status(200).json(rows.recordset);
        } else {
            res.status(404).json({ error: 'No widgets found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Widget
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { project_id, name, code, style } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('project_id', sql.Int, project_id)
            .input('name', sql.NVarChar, name)
            .input('code', sql.NVarChar, code)
            .input('style', sql.NVarChar, style)
            .query('UPDATE Widgets SET project_id = @project_id, name = @name, code = @code, style = @style WHERE id = @id');

        if (result && result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'Widget updated successfully' });
        } else {
            res.status(404).json({ error: 'Widget not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Widget
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Widgets WHERE id = @id');

        if (result && result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'Widget deleted successfully' });
        } else {
            res.status(404).json({ error: 'Widget not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;