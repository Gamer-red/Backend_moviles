const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    insertarReaccion,
    getReaccionesByPost
} = require('../controllers/reactionpostController');

const router = express.Router();

// Crear/actualizar reacción requiere autenticación
router.post('/', authenticateToken, insertarReaccion);

// Obtener reacciones puede ser público (pero con info de usuario si está autenticado)
router.get('/post/:postId', authenticateToken, getReaccionesByPost);

module.exports = router;