module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(200).json({ isPlaying: false });
    }

    const spotifyRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (spotifyRes.status === 204 || spotifyRes.status > 400) {
      return res.status(200).json({ isPlaying: false });
    }

    const song = await spotifyRes.json();
    if (!song.item || !song.is_playing) {
      return res.status(200).json({ isPlaying: false });
    }

    return res.status(200).json({
      isPlaying: true,
      title: song.item.name,
      artist: song.item.artists.map((a) => a.name).join(", "),
      album: song.item.album.name,
      albumArt: song.item.album.images[0]?.url || "",
      songUrl: song.item.external_urls.spotify,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
