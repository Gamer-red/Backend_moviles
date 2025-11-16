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

module.exports={
    Insertmultimedia,
    getMultimediaByPost,
    deleteMultimedia
}