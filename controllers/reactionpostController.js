const db = require('../config/database');

const insertarReaccion = async (req, res) => {
    try {
        const { id_publicaciones, tipo } = req.body;
        const userId = req.user.userId;

        // Validaciones
        if (!id_publicaciones) {
            return res.status(400).json({ error: "El ID de la publicación es requerido" });
        }

        if (!tipo || !['me_gusta', 'no_megusta'].includes(tipo)) {
            return res.status(400).json({ error: "Tipo de reacción inválido. Use 'me_gusta' o 'no_megusta'" });
        }

        // Verificar que la publicación existe
        const [posts] = await db.execute(
            'SELECT id_publicaciones FROM publicaciones WHERE id_publicaciones = ?',
            [id_publicaciones]
        );

        if (posts.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        // Verificar si el usuario ya tiene una reacción en esta publicación
        const [existingReactions] = await db.execute(
            'SELECT id_reaccion, tipo FROM reacciones_publicaciones WHERE id_publicaciones = ? AND id_usuario = ?',
            [id_publicaciones, userId]
        );

        let result;

        if (existingReactions.length > 0) {
            // Ya existe una reacción, actualizarla
            const existingReaction = existingReactions[0];
            
            if (existingReaction.tipo === tipo) {
                // Mismo tipo: eliminar la reacción (toggle)
                await db.execute(
                    'DELETE FROM reacciones_publicaciones WHERE id_reaccion = ?',
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
                    'UPDATE reacciones_publicaciones SET tipo = ?, fecha = CURRENT_TIMESTAMP WHERE id_reaccion = ?',
                    [tipo, existingReaction.id_reaccion]
                );
            }
        } else {
            // No existe reacción, crear nueva
            [result] = await db.execute(
                `INSERT INTO reacciones_publicaciones (id_publicaciones, id_usuario, tipo, fecha) 
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                [id_publicaciones, userId, tipo]  // ← ORDEN CORRECTO
            );
        }

        // Obtener conteos actualizados
        const [likesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_publicaciones 
             WHERE id_publicaciones = ? AND tipo = 'me_gusta'`,
            [id_publicaciones]
        );

        const [dislikesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_publicaciones 
             WHERE id_publicaciones = ? AND tipo = 'no_megusta'`,
            [id_publicaciones]
        );

        // Verificar reacción actual del usuario
        const [userReaction] = await db.execute(
            'SELECT tipo FROM reacciones_publicaciones WHERE id_publicaciones = ? AND id_usuario = ?',
            [id_publicaciones, userId]
        );

        res.json({
            message: existingReactions.length > 0 ? 'Reacción actualizada' : 'Reacción agregada exitosamente',
            action: existingReactions.length > 0 ? 'updated' : 'added',
            userReaction: userReaction.length > 0 ? userReaction[0].tipo : null,
            counts: {
                me_gusta: likesCount[0].count,
                no_megusta: dislikesCount[0].count
            }
        });

    } catch (error) {
        console.error('Error en reacción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener reacciones de una publicación
const getReaccionesByPost = async (req, res) => {
    try {
        const postId = req.params.postId;

        // Obtener conteos
        const [likesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_publicaciones 
             WHERE id_publicaciones = ? AND tipo = 'me_gusta'`,
            [postId]
        );

        const [dislikesCount] = await db.execute(
            `SELECT COUNT(*) as count FROM reacciones_publicaciones 
             WHERE id_publicaciones = ? AND tipo = 'no_megusta'`,
            [postId]
        );

        // Obtener reacción del usuario actual (si está autenticado)
        let userReaction = null;
        if (req.user) {
            const [userReactions] = await db.execute(
                'SELECT tipo FROM reacciones_publicaciones WHERE id_publicaciones = ? AND id_usuario = ?',
                [postId, req.user.userId]
            );
            userReaction = userReactions.length > 0 ? userReactions[0].tipo : null;
        }

        res.json({
            counts: {
                me_gusta: likesCount[0].count,
                no_megusta: dislikesCount[0].count,
                total: parseInt(likesCount[0].count) + parseInt(dislikesCount[0].count)
            },
            userReaction: userReaction
        });

    } catch (error) {
        console.error('Error obteniendo reacciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    insertarReaccion,
    getReaccionesByPost
};