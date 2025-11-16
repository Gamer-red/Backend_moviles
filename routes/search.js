const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    searchPosts,
    searchMyPosts,
    searchComments
} = require('../controllers/searchController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Buscar publicaciones públicas
router.get('/posts', searchPosts);

// Buscar en mis publicaciones
router.get('/my-posts', searchMyPosts);

module.exports = router;