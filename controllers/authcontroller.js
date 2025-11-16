const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro de usuario
const register = async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, correo, contrasenia, alias, telefono } = req.body;

    // Validar contraseña (mínimo 10 caracteres, mayúscula, minúscula, número)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
    if (!passwordRegex.test(contrasenia)) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número' 
      });
    }

    // Verificar si el correo ya existe
    const [existingUser] = await db.execute(
      'SELECT Id_usuario FROM usuarios WHERE Correo = ?',
      [correo]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contrasenia, 10);

    // Insertar usuario
    const [result] = await db.execute(
      `INSERT INTO usuarios (Nombre, Apellido_paterno, Apellido_materno, Correo, Contrasenia, Alias, telefono) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido_paterno, apellido_materno, correo, hashedPassword, alias, telefono]
    );

    // Generar token JWT
    const token = jwt.sign(
      { userId: result.insertId, correo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: result.insertId,
        nombre,
        correo,
        alias
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { correo, contrasenia } = req.body;

    // Buscar usuario
    const [users] = await db.execute(
      'SELECT * FROM usuarios WHERE Correo = ?',
      [correo]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(contrasenia, user.Contrasenia);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.Id_usuario, correo: user.Correo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        Id_usuario: user.Id_usuario,           // ← Con mayúscula
        Nombre: user.Nombre,                   // ← Con mayúscula  
        Apellido_paterno: user.Apellido_paterno, // ← Con mayúscula
        Apellido_materno: user.Apellido_materno, // ← Con mayúscula
        Correo: user.Correo,                   // ← Con mayúscula
        Alias: user.Alias,                     // ← Con mayúscula
        telefono: user.telefono,               // ← minúscula
        Avatar: user.Avatar ? user.Avatar.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) =>{
  try {
    res.json({
      message: 'Logout exitoso. Por favor elimina el token',
      logoutTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(500).json({error: 'Error interno del servidor'});
    
  }
};


module.exports = { register, 
  login,
  logout
};