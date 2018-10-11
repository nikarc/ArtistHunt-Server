/**
 * Routes to handle Spotify token creation and refresh
 */

const axios = require('axios');

const {
  SPOTIFY_CLIENTID,
  SPOTIFY_SECRET,
  SPOTIFY_REDIRECT,
} = process.env;

const base64String = `${SPOTIFY_CLIENTID}:${SPOTIFY_SECRET}`;

module.exports = (app) => {

  /**
   * Route to generate user tokens
   */
  app.post('/api/token', async (req, res) => {
    const { body: { code: authorization_code } } = req;

    try {
      const { data: json } = await axios({
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${base64String}`,
        },
        data: {
          grant_type: 'authorization_code',
          redirect_uri: SPOTIFY_REDIRECT,
          code: authorization_code,
        },
      });

      res.json(json);
    } catch (err) {
      console.error(err);
      res.status(500).json(err.data);
    }
  });

  /**
   * Route to refresh Spotify token
   */
  app.post('/api/refresh_token', async (req, res) => {
    const { body: { refresh_token } } = req;

    try {
      const { data: json } = await axios({
        method: 'POST',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${base64String}`,
        },
        data: {
          grant_type: 'refresh_token',
          refresh_token,
        },
      });

      res.json(json);
    } catch (err) {
      console.error(err);
      res.status(500).json(err.data);
    }
  });
};
