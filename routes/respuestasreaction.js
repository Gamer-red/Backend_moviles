const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    insertarReaccionRespuesta,
    getReaccionesByRespuesta
} = require('../controllers/reactionrespuestaController');

const router = express.Router();

// Crear/actualizar reacción a respuesta requiere autenticación
router.post('/', authenticateToken, insertarReaccionRespuesta);

// Obtener reacciones de una respuesta
router.get('/respuesta/:respuestaId', authenticateToken, getReaccionesByRespuesta);

module.exports = router;