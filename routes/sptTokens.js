/**
 * Routes to handle Spotify token creation and refresh
 */

const fetch = require('node-fetch');

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
      const { data: json } = fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(base64String).toString('base64')}`,
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

  app.post('/api/refresh_token', async (req, res) => {
    const { body: { refresh_token } } = req;

    try {
      const { data: json } = fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(base64String).toString('base64')}`,
        },
        data: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token,
        }),
      });

      res.json(json);
    } catch (err) {
      console.error(err);
      res.status(500).json(err.data);
    }
  });
};
