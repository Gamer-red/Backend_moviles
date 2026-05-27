const bcrypt = require('bcrypt');
const db = require('./config/database');

async function hashPassword() {
    const email = 'usuario@gmail.com';
    const plainPassword = 'Fernanfloo01'; // Cambia por la contraseña real
    
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    await db.execute(
        'UPDATE usuarios SET Contrasenia = ? WHERE Correo = ?',
        [hashedPassword, email]
    );
    
    console.log('✅ Contraseña hasheada correctamente');
    console.log('📝 Nuevo hash:', hashedPassword);
    process.exit();
}

hashPassword();