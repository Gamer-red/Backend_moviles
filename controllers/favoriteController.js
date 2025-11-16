const db = require('../config/database');

// Agregar publicación a favoritos
const addToFavorites = async (req, res) => {
    try {
        const { id_publicacion } = req.body;
        const userId = req.user.userId;

        // Validaciones
        if (!id_publicacion) {
            return res.status(400).json({ error: "El ID de la publicación es requerido" });
        }

        // Verificar que la publicación existe
        const [posts] = await db.execute(
            'SELECT id_publicaciones FROM publicaciones WHERE id_publicaciones = ?',
            [id_publicacion]
        );

        if (posts.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        // Verificar si ya está en favoritos
        const [existingFavorites] = await db.execute(
            'SELECT id_favorito FROM favoritos WHERE id_usuario = ? AND id_publicacion = ?',
            [userId, id_publicacion]
        );

        if (existingFavorites.length > 0) {
            return res.status(400).json({ error: 'La publicación ya está en tus favoritos' });
        }

        // Agregar a favoritos
        const [result] = await db.execute(
            `INSERT INTO favoritos (id_usuario, id_publicacion, fecha_agregado) 
             VALUES (?, ?, CURDATE())`,
            [userId, id_publicacion]
        );

        res.status(201).json({
            message: 'Publicación agregada a favoritos exitosamente',
            favoriteId: result.insertId,
            postId: id_publicacion
        });

    } catch (error) {
        console.error('Error agregando a favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar publicación de favoritos
const removeFromFavorites = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user.userId;

        // Verificar que el favorito existe
        const [existingFavorites] = await db.execute(
            'SELECT id_favorito FROM favoritos WHERE id_usuario = ? AND id_publicacion = ?',
            [userId, postId]
        );

        if (existingFavorites.length === 0) {
            return res.status(404).json({ error: 'La publicación no está en tus favoritos' });
        }

        // Eliminar de favoritos
        await db.execute(
            'DELETE FROM favoritos WHERE id_usuario = ? AND id_publicacion = ?',
            [userId, postId]
        );

        res.json({
            message: 'Publicación eliminada de favoritos exitosamente',
            removedPostId: postId
        });

    } catch (error) {
        console.error('Error eliminando de favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todos los favoritos del usuario
const getUserFavorites = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const offset = (page - 1) * limit;

        // Obtener publicaciones favoritas con información completa
        const query = `
            SELECT p.*, u.Alias, u.Nombre, f.fecha_agregado, f.id_favorito
            FROM favoritos f
            INNER JOIN publicaciones p ON f.id_publicacion = p.id_publicaciones
            INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario
            WHERE f.id_usuario = ? AND p.Borrador = 0
            ORDER BY f.fecha_agregado DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [favorites] = await db.execute(query, [userId]);

        // Obtener conteos de likes y comentarios para cada publicación favorita
        for (let favorite of favorites) {
            const [likesCount] = await db.execute(
                `SELECT COUNT(*) as count FROM reacciones_publicaciones 
                 WHERE id_publicaciones = ? AND tipo = 'me_gusta'`,
                [favorite.id_publicaciones]
            );

            const [commentsCount] = await db.execute(
                `SELECT COUNT(*) as count FROM comentarios 
                 WHERE Id_publicaciones = ?`,
                [favorite.id_publicaciones]
            );

            favorite.likes = parseInt(likesCount[0].count);
            favorite.commentsCount = parseInt(commentsCount[0].count);
        }

        // Obtener total para paginación
        const [total] = await db.execute(
            'SELECT COUNT(*) as total FROM favoritos WHERE id_usuario = ?',
            [userId]
        );

        res.json({
            favorites,
            pagination: {
                page,
                limit,
                total: total[0].total,
                totalPages: Math.ceil(total[0].total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Verificar si una publicación está en favoritos
const checkIfFavorite = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user.userId;

        const [favorites] = await db.execute(
            'SELECT id_favorito FROM favoritos WHERE id_usuario = ? AND id_publicacion = ?',
            [userId, postId]
        );

        const isFavorite = favorites.length > 0;

        res.json({
            isFavorite: isFavorite,
            favoriteId: isFavorite ? favorites[0].id_favorito : null
        });

    } catch (error) {
        console.error('Error verificando favorito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    addToFavorites,
    removeFromFavorites,
    getUserFavorites,
    checkIfFavorite
};