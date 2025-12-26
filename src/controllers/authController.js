const authService = require('../services/authService');

const login = async (req, res) => {
  console.log("content-type:", req.headers["content-type"]);
console.log("body:", req.body);

  const result = await authService.login(req.body);
  res.json(result);
};

module.exports = {
  login,
};
