const db = require('../config/database');

// Crear respuesta a un comentario
const createResponse = async (req, res) => {
    try {
        const { respuesta, id_comentario } = req.body;
        const userId = req.user.userId;

        // Validaciones
        if (!respuesta) {
            return res.status(400).json({ error: "La respuesta no puede quedar en blanco" });
        }

        if (!id_comentario) {
            return res.status(400).json({ error: "ID del comentario es requerido" });
        }

        if (respuesta.length > 255) {
            return res.status(400).json({ error: "La respuesta no puede exceder 255 caracteres" });
        }

        // Verificar que el comentario existe
        const [comentarios] = await db.execute(
            'SELECT Id_comentario FROM comentarios WHERE Id_comentario = ?',
            [id_comentario]
        );

        if (comentarios.length === 0) {
            return res.status(404).json({ error: "Comentario no encontrado" });
        }

        // Insertar respuesta
        const [result] = await db.execute(
            `INSERT INTO respuestas (respuesta, id_comentario, id_usuario, Fecha, Hora) 
             VALUES (?, ?, ?, CURDATE(), CURTIME())`,
            [respuesta, id_comentario, userId]
        );

        // Obtener la respuesta recién creada con información del usuario
        const [respuestas] = await db.execute(
            `SELECT r.*, u.Alias
             FROM respuestas r 
             INNER JOIN usuarios u ON r.id_usuario = u.Id_usuario 
             WHERE r.id_respuesta = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Respuesta creada exitosamente',
            response: respuestas[0]
        });

    } catch (error) {
        console.error('Error creando respuesta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener respuestas de un comentario
const getResponsesByComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;

        const [responses] = await db.execute(
            `SELECT r.*, u.Alias
             FROM respuestas r 
             INNER JOIN usuarios u ON r.id_usuario = u.Id_usuario 
             WHERE r.id_comentario = ? 
             ORDER BY r.Fecha DESC, r.Hora DESC`,
            [commentId]
        );

        // Obtener conteo de reacciones para cada respuesta
        for (let response of responses) {
            const [likesCount] = await db.execute(
                `SELECT COUNT(*) as count FROM reacciones_respuestas 
                 WHERE id_respuesta = ? AND tipo = 'me_gusta'`,
                [response.id_respuesta]
            );

            const [dislikesCount] = await db.execute(
                `SELECT COUNT(*) as count FROM reacciones_respuestas 
                 WHERE id_respuesta = ? AND tipo = 'no_megusta'`,
                [response.id_respuesta]
            );

            response.likes = parseInt(likesCount[0].count);
            response.dislikes = parseInt(dislikesCount[0].count);
            
            // Obtener reacción del usuario actual si está autenticado
            if (req.user && req.user.userId) {
                const [userReaction] = await db.execute(
                    'SELECT tipo FROM reacciones_respuestas WHERE id_respuesta = ? AND id_usuario = ?',
                    [response.id_respuesta, req.user.userId]
                );
                response.userReaction = userReaction.length > 0 ? userReaction[0].tipo : null;
            }
        }

        res.json({ 
            responses,
            count: responses.length 
        });

    } catch (error) {
        console.error('Error obteniendo respuestas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Editar respuesta
const updateResponse = async (req, res) => {
    try {
        const responseId = req.params.id;
        const userId = req.user.userId;
        const { respuesta } = req.body;

        // Validaciones
        if (!respuesta) {
            return res.status(400).json({ error: "La respuesta no puede quedar en blanco" });
        }

        if (respuesta.length > 255) {
            return res.status(400).json({ error: "La respuesta no puede exceder 255 caracteres" });
        }

        // Verificar que la respuesta existe y pertenece al usuario
        const [existingResponses] = await db.execute(
            'SELECT * FROM respuestas WHERE id_respuesta = ? AND id_usuario = ?',
            [responseId, userId]
        );

        if (existingResponses.length === 0) {
            return res.status(404).json({ 
                error: 'Respuesta no encontrada o no tienes permisos para editarla' 
            });
        }

        // Actualizar respuesta
        await db.execute(
            'UPDATE respuestas SET respuesta = ?, Fecha = CURDATE(), Hora = CURTIME() WHERE id_respuesta = ?',
            [respuesta, responseId]
        );

        // Obtener la respuesta actualizada
        const [updatedResponses] = await db.execute(
            `SELECT r.*, u.Alias
             FROM respuestas r 
             INNER JOIN usuarios u ON r.id_usuario = u.Id_usuario 
             WHERE r.id_respuesta = ?`,
            [responseId]
        );

        res.json({
            message: 'Respuesta actualizada exitosamente',
            response: updatedResponses[0]
        });

    } catch (error) {
        console.error('Error actualizando respuesta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar respuesta
const deleteResponse = async (req, res) => {
    try {
        const responseId = req.params.id;
        const userId = req.user.userId;

        // Verificar que la respuesta existe y pertenece al usuario
        const [existingResponses] = await db.execute(
            'SELECT id_respuesta FROM respuestas WHERE id_respuesta = ? AND id_usuario = ?',
            [responseId, userId]
        );

        if (existingResponses.length === 0) {
            return res.status(404).json({ 
                error: 'Respuesta no encontrada o no tienes permisos para eliminarla' 
            });
        }

        // Eliminar la respuesta (las reacciones se eliminarán por CASCADE)
        await db.execute(
            'DELETE FROM respuestas WHERE id_respuesta = ?',
            [responseId]
        );

        res.json({
            message: 'Respuesta eliminada exitosamente',
            deletedResponseId: responseId
        });

    } catch (error) {
        console.error('Error eliminando respuesta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    createResponse,
    getResponsesByComment,
    updateResponse,
    deleteResponse
};