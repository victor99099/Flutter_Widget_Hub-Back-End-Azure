const express = require('express');
const { poolPromise, sql } = require('../db');
const router = express.Router();

// GET all projects of a specific user with their widgets
router.get('/:user_id/projects', async (req, res) => {
    const { user_id } = req.params;

    try {
        const pool = await poolPromise;

        const query = `
            SELECT 
                Projects.id AS projectId, 
                Projects.name AS projectName, 
                Projects.style AS projectStyle,
                Widgets.id AS widgetId,
                Widgets.name AS widgetName,
                Widgets.code AS widgetCode,
                Widgets.widgetNumber AS widgetNumber
            FROM Projects
            LEFT JOIN Widgets ON Projects.id = Widgets.project_id
            WHERE Projects.user_id = @user_id;
        `;

        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .query(query);

        const projects = result.recordset.reduce((acc, row) => {
            const project = acc.find(p => p.projectId === row.projectId);
            const widget = row.widgetId ? {
                widgetId: row.widgetId,
                widgetName: row.widgetName,
                widgetCode: row.widgetCode,
                widgetNumber: row.widgetNumber
            } : null;

            if (project) {
                if (widget) project.widgets.push(widget);
            } else {
                acc.push({
                    projectId: row.projectId,
                    projectName: row.projectName,
                    projectStyle: row.projectStyle,
                    widgets: widget ? [widget] : []
                });
            }
            return acc;
        }, []);

        res.status(200).json(projects);
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:user_id/projects/:project_id', async (req, res) => {
    const { user_id, project_id } = req.params;

    try {
        const pool = await poolPromise;

        const query = `
            SELECT 
                Projects.id AS projectId, 
                Projects.name AS projectName, 
                Projects.style AS projectStyle,
                Widgets.id AS widgetId,
                Widgets.name AS widgetName,
                Widgets.code AS widgetCode,
                Widgets.widgetNumber AS widgetNumber
            FROM Projects
            LEFT JOIN Widgets ON Projects.id = Widgets.project_id
            WHERE Projects.user_id = @user_id AND Projects.id = @project_id;
        `;

        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('project_id', sql.Int, project_id)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Project not found or does not belong to the user' });
        }

        const project = result.recordset.reduce((acc, row) => {
            if (!acc) {
                acc = {
                    projectId: row.projectId,
                    projectName: row.projectName,
                    projectStyle: row.projectStyle,
                    widgets: []
                };
            }

            if (row.widgetId) {
                acc.widgets.push({
                    widgetId: row.widgetId,
                    widgetName: row.widgetName,
                    widgetCode: row.widgetCode,
                    widgetNumber: row.widgetNumber
                });
            }

            return acc;
        }, null);

        res.status(200).json(project);
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
