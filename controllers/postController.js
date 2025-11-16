const db = require('../config/database');

// Crear nueva publicación
const createPost = async (req, res) => {
  try {
    const { titulo, descripcion, borrador = false } = req.body;
    const userId = req.user.userId;

    // Validaciones básicas
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'Título y descripción son requeridos' });
    }

    if (titulo.length > 30) {
      return res.status(400).json({ error: 'El título no puede exceder 30 caracteres' });
    }

    if (descripcion.length > 255) {
      return res.status(400).json({ error: 'La descripción no puede exceder 255 caracteres' });
    }

    // Insertar publicación
    const [result] = await db.execute(
      `INSERT INTO publicaciones (Id_usuario, Titulo, Descripcion, Fecha_creacion, Fecha_modificacion, Borrador) 
       VALUES (?, ?, ?, CURDATE(), CURDATE(), ?)`,
      [userId, titulo, descripcion, borrador ? 1 : 0]
    );

    res.status(201).json({
      message: borrador ? 'Borrador guardado' : 'Publicación creada exitosamente',
      postId: result.insertId,
      post: {
        id: result.insertId,
        titulo,
        descripcion,
        borrador: Boolean(borrador)
      }
    });

  } catch (error) {
    console.error('Error creando publicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todas las publicaciones (con paginación)
const getPosts = async (req, res) => {
  try {
    // Convertir a números de manera segura
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    console.log(`Page: ${page} (${typeof page}), Limit: ${limit} (${typeof limit}), Offset: ${offset} (${typeof offset})`);

    // SOLUCIÓN: Usar template literals para la consulta en lugar de parámetros
    const query = `
      SELECT p.*, u.Alias, u.Nombre 
      FROM publicaciones p 
      INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
      WHERE p.Borrador = 0 
      ORDER BY p.Fecha_creacion DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    console.log('Ejecutando query:', query);

    // Ejecutar sin parámetros (ya están incluidos en el query)
    const [posts] = await db.execute(query);

    // Obtener conteo de likes y comentarios para cada publicación
    for (let post of posts) {
      // Contar likes
      const [likes] = await db.execute(
        `SELECT COUNT(*) as count FROM reacciones_publicaciones 
         WHERE id_publicaciones = ? AND tipo = 'me_gusta'`,
        [post.id_publicaciones]
      );
      post.likes = likes[0].count;

      // Contar comentarios
      const [comments] = await db.execute(
        `SELECT COUNT(*) as count FROM comentarios 
         WHERE Id_publicaciones = ?`,
        [post.id_publicaciones]
      );
      post.commentsCount = comments[0].count;
    }

    // Obtener total para paginación
    const [total] = await db.execute(
      'SELECT COUNT(*) as total FROM publicaciones WHERE Borrador = 0'
    );

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: total[0].total,
        totalPages: Math.ceil(total[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo publicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
};

// Obtener publicación específica
const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;

    const [posts] = await db.execute(
      `SELECT p.*, u.Alias, u.Nombre 
       FROM publicaciones p 
       INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
       WHERE p.id_publicaciones = ?`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const post = posts[0];

    // Obtener likes
    const [likes] = await db.execute(
      `SELECT COUNT(*) as count FROM reacciones_publicaciones 
       WHERE id_publicaciones = ? AND tipo = 'me_gusta'`,
      [postId]
    );
    post.likes = likes[0].count;

    // Obtener comentarios
    const [comments] = await db.execute(
      `SELECT c.*, u.Alias 
       FROM comentarios c 
       INNER JOIN usuarios u ON c.Id_usuario = u.Id_usuario 
       WHERE c.Id_publicaciones = ? 
       ORDER BY c.Fecha DESC, c.Hora DESC`,
      [postId]
    );
    post.comments = comments;

    res.json({ post });

  } catch (error) {
    console.error('Error obteniendo publicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener publicaciones del usuario actual
const getMyPosts = async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const borrador = req.query.borrador ? 1 : 0;

    let query = `SELECT p.* FROM publicaciones p WHERE p.Id_usuario = ?`;
    let params = [userId];

    if (borrador !== undefined) {
      query += ' AND p.Borrador = ?';
      params.push(borrador ? 1 : 0);
    }

    query += ' ORDER BY p.Fecha_creacion DESC';

    const [posts] = await db.execute(query, params);

    res.json({ posts });

  } catch (error) {
    console.error('Error obteniendo publicaciones del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;
    const { titulo, descripcion, borrador } = req.body;

    // Validar que la publicación existe y pertenece al usuario
    const [existingPosts] = await db.execute(
      'SELECT * FROM publicaciones WHERE id_publicaciones = ? AND Id_usuario = ?',
      [postId, userId]
    );

    if (existingPosts.length === 0) {
      return res.status(404).json({ 
        error: 'Publicación no encontrada o no tienes permisos para editarla' 
      });
    }

    const post = existingPosts[0];

    // Validaciones
    if (titulo && titulo.length > 30) {
      return res.status(400).json({ error: 'El título no puede exceder 30 caracteres' });
    }

    if (descripcion && descripcion.length > 255) {
      return res.status(400).json({ error: 'La descripción no puede exceder 255 caracteres' });
    }

    // Construir query dinámicamente basado en los campos proporcionados
    let updateFields = [];
    let updateValues = [];

    if (titulo !== undefined) {
      updateFields.push('Titulo = ?');
      updateValues.push(titulo);
    }

    if (descripcion !== undefined) {
      updateFields.push('Descripcion = ?');
      updateValues.push(descripcion);
    }

    if (borrador !== undefined) {
      updateFields.push('Borrador = ?');
      updateValues.push(borrador ? 1 : 0);
    }

    // Siempre actualizar fecha de modificación
    updateFields.push('Fecha_modificacion = CURDATE()');

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    updateValues.push(postId, userId); // Para el WHERE

    const query = `
      UPDATE publicaciones 
      SET ${updateFields.join(', ')} 
      WHERE id_publicaciones = ? AND Id_usuario = ?
    `;

    await db.execute(query, updateValues);

    // Obtener la publicación actualizada
    const [updatedPosts] = await db.execute(
      `SELECT p.*, u.Alias, u.Nombre 
       FROM publicaciones p 
       INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
       WHERE p.id_publicaciones = ?`,
      [postId]
    );

    res.json({
      message: 'Publicación actualizada exitosamente',
      post: updatedPosts[0]
    });

  } catch (error) {
    console.error('Error actualizando publicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // Verificar que la publicación existe y pertenece al usuario
    const [existingPosts] = await db.execute(
      'SELECT * FROM publicaciones WHERE id_publicaciones = ? AND Id_usuario = ?',
      [postId, userId]
    );

    if (existingPosts.length === 0) {
      return res.status(404).json({ 
        error: 'Publicación no encontrada o no tienes permisos para eliminarla' 
      });
    }

    // Eliminar la publicación (las foreign keys con CASCADE eliminarán automáticamente comentarios, likes, etc.)
    await db.execute(
      'DELETE FROM publicaciones WHERE id_publicaciones = ? AND Id_usuario = ?',
      [postId, userId]
    );

    res.json({
      message: 'Publicación eliminada exitosamente',
      deletedPostId: postId
    });
    
  } catch (error) {
    console.error('Error eliminando publicación:', error);
    
    // Manejar error de foreign key constraint
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'No se puede eliminar la publicación porque tiene comentarios o reacciones asociadas' 
      });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  getMyPosts,
  updatePost,
  deletePost
};