const db = require('../config/database');

const insertarReaccionComentario = async (req, res) => {
    try {
        const { id_comentario, tipo } = req.body;
        const userId = req.user.userId;

        // Validaciones
        if (!id_comentario) {
            return res.status(400).json({ error: "El ID del comentario es requerido" });
        }

        if (!tipo || !['me_gusta', 'no_megusta'].includes(tipo)) {
            return res.status(400).json({ error: "Tipo de reacción inválido. Use 'me_gusta' o 'no_megusta'" });
        }

        // Verificar que el comentario existe
        const [comentarios] = await db.execute(
            'SELECT Id_comentario FROM comentarios WHERE Id_comentario = ?',
            [id_comentario]
        );

        if (comentarios.length === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }

        // Verificar si el usuario ya tiene una reacción en este comentario
        const [existingReactions] = await db.execute(
            'SELECT id_reaccion, tipo FROM reacciones_comentarios WHERE id_comentario = ? AND id_usuario = ?',
            [id_comentario, userId]
        );

        let result;

        if (existingReactions.length > 0) {
            // Ya existe una reacción, actualizarla
            const existingReaction = existingReactions[0];
            
            if (existingReaction.tipo === tipo) {
                // Mismo tipo: eliminar la reacción (toggle)
                await db.execute(
                    'DELETE FROM reacciones_comentarios WHERE id_reaccion = ?',
                    [existingReaction.id_reaccion]
                );
                
                return res.json({
                    message: 'Reacción eliminada exitosamente',
                    action: 'removed',
                    tipo: null
                });
            } else {
                // Diferente tipo: actualizar
                [result] = await db.execute(
                    'UPDATE reacciones_comentarios SET tipo = ?, fecha = CURRENT_TIMESTAMP WHERE id_reaccion = ?',
                    [tipo, existingReaction.id_reaccion]
                );
            }
        } else {
            // No existe reacción, crear nueva
            [result] = await db.execute(
                `INSERT INTO reacciones_comentarios (id_comentario, id_usuario, tipo, fecha) 
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                [id_comentario, userId, tipo]
            );
        }

        // Obtener conteos actualizados
        const [likesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_comentarios 
             WHERE id_comentario = ? AND tipo = 'me_gusta'`,
            [id_comentario]
        );

        const [dislikesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_comentarios 
             WHERE id_comentario = ? AND tipo = 'no_megusta'`,
            [id_comentario]
        );

        // Verificar reacción actual del usuario
        const [userReaction] = await db.execute(
            'SELECT tipo FROM reacciones_comentarios WHERE id_comentario = ? AND id_usuario = ?',
            [id_comentario, userId]
        );

        res.json({
            message: existingReactions.length > 0 ? 'Reacción actualizada' : 'Reacción agregada exitosamente',
            action: existingReactions.length > 0 ? 'updated' : 'added',
            userReaction: userReaction.length > 0 ? userReaction[0].tipo : null,
            counts: {
                me_gusta: parseInt(likesCount[0].count),
                no_megusta: parseInt(dislikesCount[0].count),
                total: parseInt(likesCount[0].count) + parseInt(dislikesCount[0].count)
            }
        });

    } catch (error) {
        console.error('Error en reacción a comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener reacciones de un comentario
const getReaccionesByComentario = async (req, res) => {
    try {
        const comentarioId = req.params.comentarioId;

        // Obtener conteos
        const [likesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_comentarios 
             WHERE id_comentario = ? AND tipo = 'me_gusta'`,
            [comentarioId]
        );

        const [dislikesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_comentarios 
             WHERE id_comentario = ? AND tipo = 'no_megusta'`,
            [comentarioId]
        );

        // Obtener reacción del usuario actual (si está autenticado)
        let userReaction = null;
        if (req.user && req.user.userId) {
            const [userReactions] = await db.execute(
                'SELECT tipo FROM reacciones_comentarios WHERE id_comentario = ? AND id_usuario = ?',
                [comentarioId, req.user.userId]
            );
            userReaction = userReactions.length > 0 ? userReactions[0].tipo : null;
        }

        res.json({
            counts: {
                me_gusta: parseInt(likesCount[0].count),
                no_megusta: parseInt(dislikesCount[0].count),
                total: parseInt(likesCount[0].count) + parseInt(dislikesCount[0].count)
            },
            userReaction: userReaction
        });

    } catch (error) {
        console.error('Error obteniendo reacciones de comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    insertarReaccionComentario,
    getReaccionesByComentario
};