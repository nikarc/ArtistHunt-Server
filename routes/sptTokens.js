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
  app.post('/api/token', async ({ body: { code: authorization_code } }, response) => {
    try {
      const { data: json } = await axios({
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
      });
      response.set('Content-Type', 'text/json').status(200).send(json);
    } catch (err) {
      response.set('Content-Type', 'text/json').status(402).send(err.data);
    }
  });

  /**
   * Route to refresh Spotify token
   */
  app.post('/api/refresh_token', async ({ body: { refresh_token } }, response) => {
    try {
      const { data: json } = await axios({
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
      });
      response.set('Content-Type', 'text/json').status(200).send(json);
    } catch (err) {
      response.set('Content-Type', 'text/json').status(402).send(err.data);
    }
  });
};
