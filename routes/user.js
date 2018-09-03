const { Pool } = require('pg');
const fetch = require('node-fetch');

const pool = new Pool();
const {
  SPOTIFY_CLIENTID,
  SPOTIFY_SECRET,
  SPOTIFY_REDIRECT,
  PLAYLIST_LAMBDA_URL,
  PLAYLIST_LAMBDA_API_KEY,
 } = process.env;

module.exports = (app) => {
  // create user
  app.post('/api/signup', async (req, res) => {
    const client = await pool.connect();
    const { code } = req.body;
    if (!code) return res.status(400).send('Missing required parameters in request body');

    try {
      const form = new URLSearchParams();
      form.append('code', code);
      form.append('grant_type', 'authorization_code');
      form.append('redirect_uri', SPOTIFY_REDIRECT);

      const authorization = Buffer.from(`${SPOTIFY_CLIENTID}:${SPOTIFY_SECRET}`).toString('base64');

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authorization}`,
        },
        body: form,
      });
      const tokenJson = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return res.status(500).send(tokenJson);
      }

      const { access_token, refresh_token } = tokenJson;

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
      const expiresIn = new Date();
      expiresIn.setHours(expiresIn.getHours() + 1);

      const query = `INSERT INTO users(username, uri, spttoken, sptrefreshtoken, tokenexpires)
                    VALUES($1, $2, $3, $4, $5)
                    RETURNING *`;
      const values = [id, uri, access_token, refresh_token, expiresIn];

      const { rows: userRows } = await client.query(query, values);
      const [user] = userRows;
      // return UserService.initalizePlaylist({ id, access_token, refresh_token, city }, res);
      return res.send(user);
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
    try {
      const response = await fetch(PLAYLIST_LAMBDA_URL, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': PLAYLIST_LAMBDA_API_KEY,
        },
        body: JSON.stringify(req.body),
      });
      const json = await response.json();

      if (!response.ok) return res.status(500).send(json);

      return res.send('ok');
    } catch (err) {
      console.error(err);
      return res.status(500).send(err);
    }
  });
};
