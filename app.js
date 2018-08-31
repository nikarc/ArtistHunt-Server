const express = require('express');
const bodyParser = require('body-parser');

const { PORT } = process.env;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

require('./routes/user')(app);

app.listen(PORT || 8083, () => console.log(`Server listening on port ${PORT || 8083}`));
