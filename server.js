const express = require('express');
const bodyParser = require('body-parser');
const usersRoutes = require('./routes/users');
const projectsRoutes = require('./routes/projects');
const widgetsRoutes = require('./routes/widgets');
const projectwidgetsRoutes = require('./routes/projectwidgets');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Use the routes
app.use('/users', usersRoutes);
app.use('/projects', projectsRoutes);
app.use('/widgets', widgetsRoutes);
app.use('/projectwidgets', projectwidgetsRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
