const db = require('../config/database');

const insertarReaccionRespuesta = async (req, res) => {
    try {
        const { id_respuesta, tipo } = req.body;
        const userId = req.user.userId;

        // Validaciones
        if (!id_respuesta) {
            return res.status(400).json({ error: "El ID de la respuesta es requerido" });
        }

        if (!tipo || !['me_gusta', 'no_megusta'].includes(tipo)) {
            return res.status(400).json({ error: "Tipo de reacción inválido. Use 'me_gusta' o 'no_megusta'" });
        }

        // Verificar que la respuesta existe
        const [respuestas] = await db.execute(
            'SELECT id_respuesta FROM respuestas WHERE id_respuesta = ?',
            [id_respuesta]
        );

        if (respuestas.length === 0) {
            return res.status(404).json({ error: 'Respuesta no encontrada' });
        }

        // Verificar si el usuario ya tiene una reacción en esta respuesta
        const [existingReactions] = await db.execute(
            'SELECT id_reaccion, tipo FROM reacciones_respuestas WHERE id_respuesta = ? AND id_usuario = ?',
            [id_respuesta, userId]
        );

        let result;

        if (existingReactions.length > 0) {
            // Ya existe una reacción, actualizarla
            const existingReaction = existingReactions[0];
            
            if (existingReaction.tipo === tipo) {
                // Mismo tipo: eliminar la reacción (toggle)
                await db.execute(
                    'DELETE FROM reacciones_respuestas WHERE id_reaccion = ?',
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
                    'UPDATE reacciones_respuestas SET tipo = ?, fecha = CURRENT_TIMESTAMP WHERE id_reaccion = ?',
                    [tipo, existingReaction.id_reaccion]
                );
            }
        } else {
            // No existe reacción, crear nueva
            [result] = await db.execute(
                `INSERT INTO reacciones_respuestas (id_respuesta, id_usuario, tipo, fecha) 
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                [id_respuesta, userId, tipo]
            );
        }

        // Obtener conteos actualizados
        const [likesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_respuestas 
             WHERE id_respuesta = ? AND tipo = 'me_gusta'`,
            [id_respuesta]
        );

        const [dislikesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_respuestas 
             WHERE id_respuesta = ? AND tipo = 'no_megusta'`,
            [id_respuesta]
        );

        // Verificar reacción actual del usuario
        const [userReaction] = await db.execute(
            'SELECT tipo FROM reacciones_respuestas WHERE id_respuesta = ? AND id_usuario = ?',
            [id_respuesta, userId]
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
        console.error('Error en reacción a respuesta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener reacciones de una respuesta
const getReaccionesByRespuesta = async (req, res) => {
    try {
        const respuestaId = req.params.respuestaId;

        // Obtener conteos
        const [likesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_respuestas 
             WHERE id_respuesta = ? AND tipo = 'me_gusta'`,
            [respuestaId]
        );

        const [dislikesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_respuestas 
             WHERE id_respuesta = ? AND tipo = 'no_megusta'`,
            [respuestaId]
        );

        // Obtener reacción del usuario actual (si está autenticado)
        let userReaction = null;
        if (req.user && req.user.userId) {
            const [userReactions] = await db.execute(
                'SELECT tipo FROM reacciones_respuestas WHERE id_respuesta = ? AND id_usuario = ?',
                [respuestaId, req.user.userId]
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
        console.error('Error obteniendo reacciones de respuesta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    insertarReaccionRespuesta,
    getReaccionesByRespuesta
};