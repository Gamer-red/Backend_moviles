const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    insertarReaccionComentario,
    getReaccionesByComentario
} = require('../controllers/reactioncommentController');

const router = express.Router();

// Crear/actualizar reacción a comentario requiere autenticación
router.post('/', authenticateToken, insertarReaccionComentario);

// Obtener reacciones de un comentario
router.get('/comentario/:comentarioId', authenticateToken, getReaccionesByComentario);

module.exports = router;