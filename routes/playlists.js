const fetch = require('node-fetch');
const { Pool } = require('pg');

const pool = new Pool();

const { PLAYLIST_LAMBDA_URL, PLAYLIST_LAMBDA_API_KEY } = process.env;

module.exports = (app) => {
  app.post('/playlists/setup', async (req, res) => {
    const { metroAreaId, sptUsername } = req.body;
    try {
      const playlistRes = await fetch(PLAYLIST_LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': PLAYLIST_LAMBDA_API_KEY,
        },
        body: JSON.stringify({
          metroAreaId,
          sptUsername,
        }),
      });
      const json = await playlistRes.json();

      if (!playlistRes.ok) {
        return res.status(500).send(new Error(JSON.stringify(json)));
      }

      return res.send('ok');
    } catch (e) {
      console.error(e);
      return res.status(500).send(e);
    }
  });
};
