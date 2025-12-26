const healthcheck = async (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
};

module.exports = {
  healthcheck,
};
