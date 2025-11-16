const express = require('express');
const { register, login,logout
 } = require('../controllers/authcontroller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout',authenticateToken,logout);


module.exports = router;