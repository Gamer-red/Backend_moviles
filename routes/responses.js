const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    createResponse,
    getResponsesByComment,
    updateResponse,
    deleteResponse
} = require('../controllers/responseController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Crear respuesta
router.post('/', createResponse);

// Obtener respuestas de un comentario
router.get('/comment/:commentId', getResponsesByComment);

// Editar respuesta
router.put('/:id', updateResponse);

// Eliminar respuesta
router.delete('/:id', deleteResponse);

module.exports = router;