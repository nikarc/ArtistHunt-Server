const { Pool } = require('pg');
const fetch = require('node-fetch');

const pool = new Pool();

const {
  SPOTIFY_CLIENTID,
  SPOTIFY_SECRET,
  SPOTIFY_REDIRECT,
  PLAYLIST_LAMBDA_URL,
  PLAYLIST_LAMBDA_API_KEY,
  SONGKICK_API_KEY,
} = process.env;

module.exports = (app) => {
  // create user
  app.post('/api/signup', async (req, res) => {
    const client = await pool.connect();
    const { access_token, refresh_token } = req.body;
    if (!access_token || !refresh_token) return res.status(400).send('Missing required parameters in request body');

    try {
      // get user info
      const meResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      const meJson = await meResponse.json();

      if (!meResponse.ok) {
        return res.status(500).send(meJson);
      }

      const { id, uri } = meJson;
      let user;
      const expiresIn = new Date();
      expiresIn.setHours(expiresIn.getHours() + 1);
      const returnObject = {
        access_token,
        refresh_token,
        expiresIn,
      };

      // Check if user already exists in our database
      const { rows: userExistsRows } = await client.query('SELECT * FROM users WHERE username = $1', [id]);
      ([user] = userExistsRows);

      if (userExistsRows.length) {
        return res.send({
          userExists: true,
          user,
          ...returnObject,
        });
      }

      const query = `INSERT INTO users(username, uri, spttoken, sptrefreshtoken, tokenexpires)
                    VALUES($1, $2, $3, $4, $5)
                    RETURNING *`;
      const values = [id, uri, access_token, refresh_token, expiresIn];

      const { rows: userRows } = await client.query(query, values);
      ([user] = userRows);

      return res.send({
        user,
        userExists: false,
        ...returnObject,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send(err);
    } finally {
      client.release();
    }
  });

  // Add city and create playlist
  app.post('/api/setCity', async (req, res) => {
    const { metroAreaId, sptUsername } = req.body;
    const client = await pool.connect();
    console.log('SET USER METRO AREA ID: ', metroAreaId, sptUsername);
    try {
      const response = await fetch(PLAYLIST_LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': PLAYLIST_LAMBDA_API_KEY,
        },
        body: JSON.stringify(req.body),
      });
      const json = await response.json();

      if (!response.ok) return res.status(500).send(json);

      await client.query('UPDATE users SET metroareaid = $1 WHERE username = $2', [
        metroAreaId,
        sptUsername,
      ]);

      return res.send({ playlistId: json.playlistId });
    } catch (err) {
      console.error(err);
      return res.status(500).send(err);
    } finally {
      client.release();
    }
  });

  app.get('/api/:username/getUserPlaylist', async (req, res) => {
    const { username } = req.params;
    const client = await pool.connect();

    try {
      const { rows: userRows } = await client.query('SELECT id FROM users WHERE username = $1', [username]);

      if (!userRows || !userRows.length) {
        return res.status(401).send({
          message: `User not found: ${username}`,
        });
      }

      const [user] = userRows;
      const { id } = user;

      const { rows: tracks } = await client.query('SELECT * FROM tracks WHERE userid = $1', [id]);

      const trackPromises = tracks.map((t, index) => new Promise(async (resolve, reject) => {
        try {
          const url = `https://api.songkick.com/api/3.0/events/${t.eventid}.json?apikey=${SONGKICK_API_KEY}`;

          const response = await fetch(url);
          const json = await response.json();

          if (!response.ok) return reject(json);

          tracks[index].event = json.resultsPage.results.event;
          return resolve();
        } catch (err) {
          console.error(err);
          return reject(err);
        }
      }));

      await Promise.all(trackPromises);

      res.send({ tracks });
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    } finally {
      client.release();
    }
  });
};
