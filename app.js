const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const { PORT } = process.env;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/test', (req, res) => {
  res.send('ArtistHunt');
});
require('./routes/user')(app);

app.listen(PORT || 8083, () => console.log(`Server listening on port ${PORT || 8083}`));
