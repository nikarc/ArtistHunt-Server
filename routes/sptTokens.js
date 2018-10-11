/**
 * Routes to handle Spotify token creation and refresh
 */

const axios = require('axios');
const btoa = require('btoa');
const { Pool } = require('pg');

const pool = new Pool();

const {
  SPOTIFY_CLIENTID: SPOTIFY_CLIENT_ID,
  SPOTIFY_SECRET: SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT: SPOTIFY_CLIENT_CALLBACK_URL,
} = process.env;

const base64String = `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`;

module.exports = (app) => {
  /**
   * Route to generate user tokens
   */
  app.post('/api/token', ({ body: { code: authorization_code } }, response) => {
    axios({
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: base64String,
      },
      data: {
        grant_type: 'authorization_code',
        redirect_uri: SPOTIFY_CLIENT_CALLBACK_URL,
        code: authorization_code,
      },
    }).then(async ({ data: json }) => {
      const { access_token, refresh_token } = json;
      let client;
      try {
        client = await pool.connect();
        const me = await axios({
          url: 'https://api.spotify.com/v1/me',
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        console.log('ME: ', me);

        const { id, uri } = me;
        const { rows } = await client.query('SELECT id FROM users WHERE username = $1', [id]);

        if (rows.length) {
          // User exists dont create
          const [user] = rows;
          return response.set('Content-Type', 'text/json').status(200).send({
            ...json,
            user,
            userExists: true,
          });
        }

        // Create user
        const query = `INSERT INTO users(username, uri, spttoken, sptrefreshtoken)
                        VALUES($1, $2, $3, $4)
                        RETURNING *`;
        const { rows: userRows } = await client.query(query, [id, uri, access_token, refresh_token]);
        const [user] = userRows;

        return response.set('Content-Type', 'text/json').status(200).send({
          ...json,
          user,
          userExists: false,
        });
      } catch (err) {
        console.error(err);
      } finally {
        client.release();
      }
    }).catch(({ response: err }) => {
      response.set('Content-Type', 'text/json').status(402).send(err.data);
    });
  });

  /**
   * Route to refresh Spotify token
   */
  app.post('/api/refresh_token', ({ body: { refresh_token } }, response) => {
    axios({
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: base64String,
      },
      data: {
        grant_type: 'refresh_token',
        refresh_token,
      },
    }).then(({ data: json }) => {
      response.set('Content-Type', 'text/json').status(200).send(json);
    }).catch(({ response: err }) => {
      response.set('Content-Type', 'text/json').status(402).send(err.data);
    });
  });
};
