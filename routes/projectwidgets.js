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
                Projects.color AS projectColor,
                Widgets.id AS widgetId,
                Widgets.name AS widgetName,
                Widgets.code AS widgetCode,
                Widgets.style AS widgetStyle
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
                widgetStyle: row.widgetStyle
            } : null;

            if (project) {
                if (widget) project.widgets.push(widget);
            } else {
                acc.push({
                    projectId: row.projectId,
                    projectName: row.projectName,
                    projectStyle: row.projectStyle,
                    projectColor: row.projectColor,
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


module.exports = router;
