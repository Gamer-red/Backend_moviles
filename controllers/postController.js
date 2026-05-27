const db = require('../config/database');

// Crear nueva publicación
const createPost = async (req, res) => {
  try {
    const { titulo, descripcion, borrador = false, imagenes = [] } = req.body;
    const userId = req.user.userId;

    // Validaciones
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

    const postId = result.insertId;

    // Insertar imágenes en la tabla multimedia
    for (const imagenBase64 of imagenes) {
      if (imagenBase64) {
        // Limpiar el base64 (remover el prefijo data:image/...;base64,)
        const base64Data = imagenBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        await db.execute(
          `INSERT INTO multimedia (Id_publicaciones, Imagen) VALUES (?, ?)`,
          [postId, imageBuffer]
        );
      }
    }

    // Obtener la publicación creada
    const [newPost] = await db.execute(
      `SELECT p.*, u.Alias, u.Nombre 
       FROM publicaciones p 
       INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
       WHERE p.id_publicaciones = ?`,
      [postId]
    );

    // Obtener las imágenes de la publicación
    const [imagenesDB] = await db.execute(
      `SELECT Imagen FROM multimedia WHERE Id_publicaciones = ?`,
      [postId]
    );

    const imagenesBase64 = imagenesDB.map(img => img.Imagen.toString('base64'));

    res.status(201).json({
      message: borrador ? 'Borrador guardado' : 'Publicación creada exitosamente',
      postId: postId,
      post: {
        id: newPost[0].id_publicaciones,
        titulo: newPost[0].Titulo,
        descripcion: newPost[0].Descripcion,
        borrador: newPost[0].Borrador === 1
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
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const query = `
      SELECT p.*, u.Alias, u.Nombre 
      FROM publicaciones p 
      INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
      WHERE p.Borrador = 0 AND p.activo = 1
      ORDER BY p.Fecha_creacion DESC 
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const [posts] = await db.execute(query);
    
    // Para cada publicación, obtener sus imágenes
    for (let post of posts) {
      // Contar likes
      const [likes] = await db.execute(
        'SELECT COUNT(*) as count FROM reacciones_publicaciones WHERE id_publicaciones = ? AND tipo = "me_gusta"',
        [post.id_publicaciones]
      );
      post.likes = likes[0].count;

      // Contar comentarios
      const [comments] = await db.execute(
        'SELECT COUNT(*) as count FROM comentarios WHERE Id_publicaciones = ?',
        [post.id_publicaciones]
      );
      post.commentsCount = comments[0].count;

      // Verificar si el usuario guardó esta publicación
      const [saved] = await db.execute(
        'SELECT id_favorito FROM favoritos WHERE id_usuario = ? AND id_publicacion = ?',
        [userId, post.id_publicaciones]
      );
      post.guardado = saved.length > 0;

      // Obtener imágenes
      const [imagenes] = await db.execute(
        'SELECT Imagen FROM multimedia WHERE Id_publicaciones = ?',
        [post.id_publicaciones]
      );
      post.imagenes = imagenes.map(img => img.Imagen.toString('base64'));
    }

    const [total] = await db.execute('SELECT COUNT(*) as total FROM publicaciones WHERE Borrador = 0 AND activo = 1');

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
    res.status(500).json({ error: 'Error interno del servidor' });
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
    const borrador = req.query.borrador !== undefined ? parseInt(req.query.borrador) : null;

    let query = `
      SELECT p.*, u.Alias, u.Nombre 
      FROM publicaciones p 
      INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
      WHERE p.Id_usuario = ? AND p.activo = 1
    `;
    let params = [userId];

    if (borrador !== null) {
      query += ' AND p.Borrador = ?';
      params.push(borrador);
    }

    query += ' ORDER BY p.Fecha_creacion DESC';

    const [posts] = await db.execute(query, params);
    
    // Para cada publicación, obtener sus imágenes
    for (let post of posts) {
      const [imagenesDB] = await db.execute(
        `SELECT Imagen FROM multimedia WHERE Id_publicaciones = ?`,
        [post.id_publicaciones]
      );
      post.imagenes = imagenesDB.map(img => img.Imagen.toString('base64'));
    }

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
      'SELECT * FROM publicaciones WHERE id_publicaciones = ? AND Id_usuario = ? AND activo = 1',
      [postId, userId]
    );

    if (existingPosts.length === 0) {
      return res.status(404).json({ 
        error: 'Publicación no encontrada o no tienes permisos para eliminarla' 
      });
    }

    // Soft delete: solo actualizar el campo activo
    await db.execute(
      'UPDATE publicaciones SET activo = 0 WHERE id_publicaciones = ? AND Id_usuario = ?',
      [postId, userId]
    );

    res.json({
      message: 'Publicación eliminada exitosamente',
      deletedPostId: postId
    });
    
  } catch (error) {
    console.error('Error eliminando publicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getDrafts = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [drafts] = await db.execute(
      `SELECT p.*, u.Alias, u.Nombre 
       FROM publicaciones p 
       INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
       WHERE p.Id_usuario = ? AND p.Borrador = 1 AND p.activo = 1
       ORDER BY p.Fecha_creacion DESC`,
      [userId]
    );
    
    // Para cada borrador, obtener sus imágenes
    for (let draft of drafts) {
      const [imagenesDB] = await db.execute(
        `SELECT Imagen FROM multimedia WHERE Id_publicaciones = ?`,
        [draft.id_publicaciones]
      );
      draft.imagenes = imagenesDB.map(img => img.Imagen.toString('base64'));
    }
    
    res.json({ drafts });
  } catch (error) {
    console.error('Error obteniendo borradores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// En tu postController.js
const publishPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.userId;

        // Verificar que el borrador existe y pertenece al usuario
        const [existingPosts] = await db.execute(
            'SELECT * FROM publicaciones WHERE id_publicaciones = ? AND Id_usuario = ? AND Borrador = 1',
            [postId, userId]
        );

        if (existingPosts.length === 0) {
            return res.status(404).json({ 
                error: 'Borrador no encontrado o ya está publicado' 
            });
        }

        // Actualizar: cambiar Borrador a 0
        await db.execute(
            `UPDATE publicaciones 
             SET Borrador = 0, Fecha_creacion = CURDATE(), Fecha_modificacion = CURDATE()
             WHERE id_publicaciones = ?`,
            [postId]
        );

        // Obtener la publicación actualizada
        const [updatedPosts] = await db.execute(
            `SELECT p.*, u.Alias, u.Nombre 
             FROM publicaciones p 
             INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
             WHERE p.id_publicaciones = ?`,
            [postId]
        );

        res.json({
            message: 'Borrador publicado exitosamente',
            post: updatedPosts[0]
        });

    } catch (error) {
        console.error('Error publicando borrador:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// En postController.js
const getFavorites = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [favorites] = await db.execute(
          `SELECT p.*, u.Alias, u.Nombre 
          FROM favoritos f
          INNER JOIN publicaciones p ON f.id_publicacion = p.id_publicaciones
          INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario
          WHERE f.id_usuario = ? AND p.activo = 1
          ORDER BY f.fecha_agregado DESC`,
          [userId]
        );
        
        // Obtener conteo de likes y comentarios
        for (let post of favorites) {
            const [likes] = await db.execute(
                `SELECT COUNT(*) as count FROM reacciones_publicaciones 
                 WHERE id_publicaciones = ? AND tipo = 'me_gusta'`,
                [post.id_publicaciones]
            );
            post.likes = likes[0].count;
            
            const [comments] = await db.execute(
                `SELECT COUNT(*) as count FROM comentarios 
                 WHERE Id_publicaciones = ?`,
                [post.id_publicaciones]
            );
            post.commentsCount = comments[0].count;
        }
        
        res.json({ favorites });
        
    } catch (error) {
        console.error('Error obteniendo favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// En las rutas (posts.js)

module.exports = {
  createPost,
  getPosts,
  getPostById,
  getMyPosts,
  updatePost,
  deletePost,
  getDrafts,
  publishPost,
  getFavorites
};