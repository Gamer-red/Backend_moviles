const db = require('../config/database');

// Buscar publicaciones
const searchPosts = async (req, res) => {
    try {
        const { q, usuario, ordenarPor = 'fecha', orden = 'desc', pagina = 1, limite = 10 } = req.query;
        const userId = req.user.userId;
        const offset = (pagina - 1) * limite;

        // Construir query base
        let query = `
            SELECT p.*, u.Id_usuario, u.Alias, u.Nombre 
            FROM publicaciones p 
            INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
            WHERE p.Borrador = 0
        `;
        let params = [];

        // Aplicar filtros de búsqueda
        if (q) {
            query += ` AND (p.Titulo LIKE ? OR p.Descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        if (usuario) {
            query += ` AND u.Alias LIKE ?`;
            params.push(`%${usuario}%`);
        }

        // Aplicar ordenamiento
        const ordenamientos = {
            'fecha': 'p.Fecha_creacion',
            'likes': 'likes_count',
            'comentarios': 'comments_count',
            'titulo': 'p.Titulo'
        };

        const direcciones = {
            'asc': 'ASC',
            'desc': 'DESC'
        };

        const campoOrden = ordenamientos[ordenarPor] || 'p.Fecha_creacion';
        const direccionOrden = direcciones[orden] || 'DESC';

        // Query para obtener datos con conteos
        const finalQuery = `
            SELECT *, 
                (SELECT COUNT(*) FROM reacciones_publicaciones rp WHERE rp.id_publicaciones = p.id_publicaciones AND rp.tipo = 'me_gusta') as likes_count,
                (SELECT COUNT(*) FROM comentarios c WHERE c.Id_publicaciones = p.id_publicaciones) as comments_count
            FROM (${query}) p
            ORDER BY ${campoOrden} ${direccionOrden}
            LIMIT ${limite} OFFSET ${offset}
        `;

        const [posts] = await db.execute(finalQuery, params);

        // Obtener total de resultados para paginación
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_table`;
        const [total] = await db.execute(countQuery, params);

        // Verificar si el usuario actual dio like a cada publicación
        for (let post of posts) {
            const [userReaction] = await db.execute(
                'SELECT tipo FROM reacciones_publicaciones WHERE id_publicaciones = ? AND id_usuario = ?',
                [post.id_publicaciones, userId]
            );
            post.userReaction = userReaction.length > 0 ? userReaction[0].tipo : null;
            
            // Verificar si está en favoritos
            const [isFavorite] = await db.execute(
                'SELECT id_favorito FROM favoritos WHERE id_publicacion = ? AND id_usuario = ?',
                [post.id_publicaciones, userId]
            );
            post.isFavorite = isFavorite.length > 0;
        }

        res.json({
            posts,
            pagination: {
                pagina: parseInt(pagina),
                limite: parseInt(limite),
                total: total[0].total,
                totalPaginas: Math.ceil(total[0].total / limite)
            },
            filtros: {
                query: q,
                usuario: usuario,
                ordenarPor: ordenarPor,
                orden: orden
            }
        });

    } catch (error) {
        console.error('Error en búsqueda de publicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Buscar en mis publicaciones
const searchMyPosts = async (req, res) => {
    try {
        const { q, borrador, ordenarPor = 'fecha', orden = 'desc' } = req.query;
        const userId = req.user.userId;

        let query = `
            SELECT p.* 
            FROM publicaciones p 
            WHERE p.Id_usuario = ?
        `;
        let params = [userId];

        if (borrador !== undefined) {
            query += ` AND p.Borrador = ?`;
            params.push(borrador ? 1 : 0);
        }

        if (q) {
            query += ` AND (p.Titulo LIKE ? OR p.Descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        // Aplicar ordenamiento
        const ordenamientos = {
            'fecha': 'p.Fecha_creacion',
            'titulo': 'p.Titulo',
            'modificacion': 'p.Fecha_modificacion'
        };

        const direcciones = {
            'asc': 'ASC',
            'desc': 'DESC'
        };

        const campoOrden = ordenamientos[ordenarPor] || 'p.Fecha_creacion';
        const direccionOrden = direcciones[orden] || 'DESC';

        query += ` ORDER BY ${campoOrden} ${direccionOrden}`;

        const [posts] = await db.execute(query, params);

        res.json({
            posts,
            total: posts.length
        });

    } catch (error) {
        console.error('Error en búsqueda de mis publicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Buscar comentarios


module.exports = {
    searchPosts,
    searchMyPosts,
};