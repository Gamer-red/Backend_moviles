const db = require('../config/database');

//Crear un comentario
const createComment = async (req, res) => {
    try{
        const{comentario,id_publicaciones} = req.body;
        const userId = req.user.userId;
    if(!comentario){
        return res.status(400).json({error : "El comentario no puede quedar en blanco"});
    }

    if (!id_publicaciones) {
            return res.status(400).json({ error: "ID de publicación es requerido" });
    }

    if (comentario.length > 100){
        return res.status(400).json({error:'El comentario no puedo excederse de mas de 100 caracteres'});
    }

    const[posts]= await db.execute(
        'Select id_publicaciones FROM publicaciones WHERE id_publicaciones = ?',[id_publicaciones]
    );

    if(posts.length ===0){
        return res.status(400).json({error:'publicacion no encontrada'});
    }

    const [result] = await db.execute(
        `Insert INTO comentarios (Id_usuario, Id_publicaciones,Comentario,Fecha,Hora) VALUES (?,?,?,CURDATE(), CURTIME())`,
        [userId, id_publicaciones,comentario]
    );

    const [comments] = await db.execute(
       `SELECT c.*, u.Alias 
             FROM comentarios c 
             INNER JOIN usuarios u ON c.Id_usuario = u.Id_usuario 
             WHERE c.Id_comentario = ?`,
        [result.insertId]
    );

    res.status(201).json({
        message:'Comentario creado exitosamente',
         comment: comments[0]  
    });
    } catch (error) {
        console.error('Error creando el comentario');
        res.status(500).json({error: 'Error interno del servidor'});
    }
};

const getCommentsByPost = async (req,res)=>{
    try{
        const postId = req.params.postId;

        const [comments] = await db.execute(
            `SELECT c.*, u.Alias
             FROM comentarios c 
             INNER JOIN usuarios u ON c.Id_usuario = u.Id_usuario 
             WHERE c.Id_publicaciones = ? 
             ORDER BY c.Fecha DESC, c.Hora DESC`,
            [postId]
        );
         res.json({ comments });
    }catch (error) {
        console.error('Error obteniendo comentarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
module.exports={
    createComment,
    getCommentsByPost
}