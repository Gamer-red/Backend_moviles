const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT Id_usuario, Nombre, Apellido_paterno, Apellido_materno, Correo, Alias, telefono, Avatar FROM usuarios WHERE Id_usuario = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    res.json({
      user: {
        Id_usuario: user.Id_usuario,
        Nombre: user.Nombre,
        Apellido_paterno: user.Apellido_paterno,
        Apellido_materno: user.Apellido_materno,
        Correo: user.Correo,
        Alias: user.Alias,
        telefono: user.telefono,
        Avatar: user.Avatar ? user.Avatar.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar perfil de usuario
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombre, apellido_paterno, apellido_materno, alias, telefono, correo } = req.body;

    // Validaciones
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    if (!correo) {
      return res.status(400).json({ error: 'El correo es requerido' });
    }

    // Verificar si el nuevo correo ya existe en OTRO usuario
    if (correo) {
      const [existingEmail] = await db.execute(
        'SELECT Id_usuario FROM usuarios WHERE Correo = ? AND Id_usuario != ?',
        [correo, userId]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: 'El correo ya está registrado por otro usuario' });
      }
    }

    // Actualizar usuario en la base de datos (INCLUYENDO CORREO)
    await db.execute(
      `UPDATE usuarios 
       SET Nombre = ?, Apellido_paterno = ?, Apellido_materno = ?, Alias = ?, telefono = ?, Correo = ?
       WHERE Id_usuario = ?`,
      [nombre, apellido_paterno, apellido_materno, alias, telefono, correo, userId]
    );

    // Obtener el usuario actualizado
    const [users] = await db.execute(
      `SELECT Id_usuario, Nombre, Apellido_paterno, Apellido_materno, Correo, Alias, telefono, Avatar
       FROM usuarios WHERE Id_usuario = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        Id_usuario: user.Id_usuario,
        Nombre: user.Nombre,
        Apellido_paterno: user.Apellido_paterno,
        Apellido_materno: user.Apellido_materno,
        Correo: user.Correo,  // ← Incluir correo actualizado
        Alias: user.Alias,
        telefono: user.telefono,
        Avatar: user.Avatar ? user.Avatar.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }

    // Validar nueva contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        error: 'La nueva contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número' 
      });
    }

    // Obtener usuario actual
    const [users] = await db.execute(
      'SELECT Contrasenia FROM usuarios WHERE Id_usuario = ?',
      [req.user.userId]
    );

    const user = users[0];

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, user.Contrasenia);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await db.execute(
      'UPDATE usuarios SET Contrasenia = ? WHERE Id_usuario = ?',
      [hashedPassword, req.user.userId]
    );

    res.json({ message: 'Contraseña cambiada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};