const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/userController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener perfil del usuario actual
router.get('/profile', authenticateToken, getProfile);

// Actualizar perfil
router.put('/profile', authenticateToken, updateProfile);

// Cambiar contraseña
router.put('/change-password', changePassword);

module.exports = router;