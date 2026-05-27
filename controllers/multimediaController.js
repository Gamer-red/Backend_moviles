const db = require('../config/database');

const Insertmultimedia = async(req, res)=>{
    try {
        const{id_publicaciones} = req.body;

        if(!id_publicaciones){
            return res.status(400).json({error: "el Id de la publicacion es valido"})
        }

        const[post] = await db.execute(
            'Select id_publicaciones FROM publicaciones WHERE id_publicaciones = ?',[id_publicaciones]
        )

        if(post.length ===0){
            return res.status(400).json({error: 'Publicacion no encontrada'});
        }

        const { Imagen } = req.body;

        
        if (!Imagen) {
            return res.status(400).json({ error: "La imagen es requerida" });
        }

        // Convertir Base64 a Buffer si es necesario
        const imageBuffer = Buffer.from(Imagen, 'base64');


        const [result] = await db.execute(
            `Insert INTO multimedia (Id_publicaciones,Imagen) VALUES (?,?)`,
            [id_publicaciones,imageBuffer]
        ); 

        res.status(201).josn({
            message:'Multimedia cargada exitosamente',
            multimediaId: result.insertId,
            postId: id_publicaciones
        })


    } catch (error) {
        console.error('Error creando el comentario');
        res.status(500).json({error: 'Error interno del servidor'});
    }
}

const getMultimediaByPost = async (req, res) => {
    try {
        const postId = req.params.postId;

        const [multimedia] = await db.execute(
            `SELECT id_mulimedia, id_publicaciones 
             FROM multimedia 
             WHERE id_publicaciones = ?`,
            [postId]
        );

        res.json({ multimedia });

    } catch (error) {
        console.error('Error obteniendo multimedia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const deleteMultimedia = async (req, res) => {
    try {
        const imageId = req.params.imageId;
        const userId = req.user.userId;

        // Verificar que la imagen existe y pertenece a una publicación del usuario
        const [multimedia] = await db.execute(
            `SELECT m.id_mulimedia, p.Id_usuario 
             FROM multimedia m 
             INNER JOIN publicaciones p ON m.id_publicaciones = p.id_publicaciones 
             WHERE m.id_mulimedia = ? AND p.Id_usuario = ?`,
            [imageId, userId]
        );

        if (multimedia.length === 0) {
            return res.status(404).json({ 
                error: 'Multimedia no encontrada o no tienes permisos para eliminarla' 
            });
        }

        await db.execute(
            'DELETE FROM multimedia WHERE id_mulimedia = ?',
            [imageId]
        );

        res.json({
            message: 'Multimedia eliminada exitosamente',
            deletedImageId: imageId
        });

    } catch (error) {
        console.error('Error eliminando multimedia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const updatePostWithImages = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;
    const { titulo, descripcion, imagenes } = req.body;

    console.log("========== UPDATE POST WITH IMAGES ==========");
    console.log("Post ID:", postId);
    console.log("User ID:", userId);
    console.log("Título:", titulo);
    console.log("Descripción:", descripcion);
    console.log("Imágenes recibidas:", imagenes ? imagenes.length : 0);

    // Verificar que la publicación existe y pertenece al usuario
    const [existingPosts] = await db.execute(
      'SELECT * FROM publicaciones WHERE id_publicaciones = ? AND Id_usuario = ?',
      [postId, userId]
    );

    if (existingPosts.length === 0) {
      console.log("❌ Publicación no encontrada");
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    console.log("✅ Publicación encontrada");

    // Actualizar título y descripción
    await db.execute(
      'UPDATE publicaciones SET Titulo = ?, Descripcion = ?, Fecha_modificacion = CURDATE() WHERE id_publicaciones = ?',
      [titulo, descripcion, postId]
    );

    console.log("✅ Título y descripción actualizados");

    // Eliminar imágenes antiguas
    await db.execute('DELETE FROM multimedia WHERE Id_publicaciones = ?', [postId]);
    console.log("✅ Imágenes antiguas eliminadas");

    // Insertar nuevas imágenes
    if (imagenes && imagenes.length > 0) {
      for (let i = 0; i < imagenes.length; i++) {
        const imagenBase64 = imagenes[i];
        if (imagenBase64) {
          const base64Data = imagenBase64.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          await db.execute(
            'INSERT INTO multimedia (Id_publicaciones, Imagen) VALUES (?, ?)',
            [postId, imageBuffer]
          );
          console.log(`✅ Imagen ${i + 1} insertada`);
        }
      }
    }

    // Obtener la publicación actualizada
    const [updatedPost] = await db.execute(
      `SELECT p.*, u.Alias, u.Nombre 
       FROM publicaciones p 
       INNER JOIN usuarios u ON p.Id_usuario = u.Id_usuario 
       WHERE p.id_publicaciones = ?`,
      [postId]
    );

    // Obtener las imágenes actualizadas
    const [imagenesDB] = await db.execute(
      'SELECT Imagen FROM multimedia WHERE Id_publicaciones = ?',
      [postId]
    );
    
    const imagenesBase64 = imagenesDB.map(img => img.Imagen.toString('base64'));

    console.log("✅ Proceso completado");
    console.log("==========================================");

    res.json({
      message: 'Borrador actualizado exitosamente',
      post: {
        ...updatedPost[0],
        imagenes: imagenesBase64
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando borrador:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
};

module.exports={
    Insertmultimedia,
    getMultimediaByPost,
    deleteMultimedia,
    updatePostWithImages
}