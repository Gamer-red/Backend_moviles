const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    checkIfFavorite
} = require('../controllers/favoriteController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Agregar a favoritos
router.post('/', addToFavorites);

// Eliminar de favoritos
router.delete('/:postId', removeFromFavorites);

// Obtener favoritos del usuario
router.get('/', getUserFavorites);

// Verificar si una publicación es favorita
router.get('/check/:postId', checkIfFavorite);

module.exports = router;