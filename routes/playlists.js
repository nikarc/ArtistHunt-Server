const fetch = require('node-fetch');
const { Pool } = require('pg');

const { SONGKICK_API_KEY } = process.env;

const pool = new Pool();

module.exports = (app) => {
  app.post('/api/getUserPlaylist', async (req, res) => {
    const { username } = req.body;

    try {
      const client = await pool.connect();
      const { rows } = await client.query('SELECT id, username from users WHERE username = $1', [username]);
      const [user] = rows;

      const { rows: trackRows } = await client.query('SELECT * FROM tracks WHERE userid = $1', [user.id]);

      // Get event details
      const tracks = [];
      const eventPromises = trackRows.map(t => new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(`https://api.songkick.com/api/3.0/events/${t.eventid}.json?apikey=${SONGKICK_API_KEY}`);
          const json = await response.json();

          if (!response.ok) {
            return reject(json);
          }

          tracks.push(json.resultsPage.results.event);
          return resolve();
        } catch (err) {
          console.error(err);
          return reject(err);
        }
      }));

      await Promise.all(eventPromises);

      return res.send({
        tracks,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send(err);
    }
  });
};
