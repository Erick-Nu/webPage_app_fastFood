document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  // 1. Validaciones
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    errorDiv.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres';
    errorDiv.style.display = 'block';
    return;
  }

  // 2. Obtener access token de la URL
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');

  if (!accessToken) {
    errorDiv.textContent = 'Token inválido o expirado';
    errorDiv.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline-block';

  try {
    // 3. PASO NUEVO: Pedir credenciales al servidor (Vercel)
    const configResponse = await fetch('/api/config');
    if (!configResponse.ok) throw new Error('No se pudo obtener la configuración');
    
    const config = await configResponse.json();
    const SUPABASE_URL = config.supabaseUrl;
    const SUPABASE_KEY = config.supabaseKey;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Credenciales no configuradas en el servidor');
    }

    // 4. Petición a Supabase usando las variables obtenidas
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      successDiv.textContent = '¡Contraseña actualizada exitosamente!';
      successDiv.style.display = 'block';
      document.getElementById('resetForm').reset();

      setTimeout(() => {
        window.close(); // O redirigir a tu app principal
      }, 3000);
    } else {
      const error = await response.json();
      errorDiv.textContent = error.message || 'Error al actualizar contraseña';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    console.error(error);
    errorDiv.textContent = 'Error de conexión o configuración. Intenta nuevamente.';
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
});