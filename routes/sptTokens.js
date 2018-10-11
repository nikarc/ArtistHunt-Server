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
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(base64String).toString('base64')}`,
        },
        data: JSON.stringify({
          grant_type: 'authorization_code',
          redirect_uri: SPOTIFY_REDIRECT,
          code: authorization_code,
        }),
      });
      const tokenJson = await tokenResponse.json();
      console.log('tokenJson: ', tokenJson);

      if (!tokenResponse.ok) {
        return res.status(tokenResponse.status).json(tokenJson);
      }

      res.json(tokenJson);
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
      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
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
      const refreshJson = await refreshResponse.json();

      if (!refreshResponse.ok) {
        return res.status(refreshResponse.status).json(refreshJson);
      }

      res.json(refreshJson);
    } catch (err) {
      console.error(err);
      res.status(500).json(err.data);
    }
  });
};
