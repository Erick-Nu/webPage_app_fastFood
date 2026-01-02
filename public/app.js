// public/app.js

let supabaseClient = null;

// Referencias al DOM
const submitBtn = document.getElementById('submitBtn');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

// 1. Deshabilitar todo al inicio hasta verificar la sesión
function setFormState(enabled) {
  submitBtn.disabled = !enabled;
  passwordInput.disabled = !enabled;
  confirmInput.disabled = !enabled;
  if (!enabled) {
    submitBtn.style.opacity = "0.5";
    btnText.textContent = "Verificando enlace...";
  } else {
    submitBtn.style.opacity = "1";
    btnText.textContent = "Cambiar Contraseña";
  }
}

// Inicialmente bloqueado
setFormState(false);

async function initSupabase() {
  try {
    // A. Pedir configuración al servidor
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();

    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Faltan credenciales en el servidor');
    }

    // B. Inicializar Cliente
    supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);

    // --- NUEVO BLOQUE: INTERCAMBIO DE CÓDIGO (PKCE) ---
    // Detectamos si la URL tiene ?code=... y lo canjeamos manualmente
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        console.log("Código PKCE detectado, intercambiando...");
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
        
        if (error) {
            console.error("Error al canjear código:", error);
            throw new Error("El enlace es inválido o ha expirado: " + error.message);
        }
        console.log("Intercambio exitoso, sesión establecida.");
    }
    // --------------------------------------------------

    // C. ESCUCHADOR DE ESTADO
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento Auth:", event);

      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || session) {
        setFormState(true);
        errorDiv.style.display = 'none';
      } else if (event === 'SIGNED_OUT') {
        setFormState(false);
        // Solo mostramos error si NO estamos en proceso de carga inicial (code exchange)
        if (!code) { 
            errorDiv.textContent = 'Enlace inválido o expirado. Solicita uno nuevo.';
            errorDiv.style.display = 'block';
            btnText.textContent = "Enlace inválido";
        }
      }
    });

    // D. Verificación final manual
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        setFormState(true);
    } else if (!code) {
        // Si no hay sesión Y no había código en la URL, mostramos error
        errorDiv.textContent = 'Enlace no válido. Asegúrate de usar el link de tu correo.';
        errorDiv.style.display = 'block';
        btnText.textContent = "Enlace requerido";
    }

  } catch (error) {
    console.error("Error init:", error);
    errorDiv.textContent = error.message || 'Error de conexión. Recarga la página.';
    errorDiv.style.display = 'block';
    btnText.textContent = "Error";
  }
}

// Arrancar
initSupabase();

// --- Manejo del Formulario ---
document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  if (password !== confirmPassword) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    errorDiv.style.display = 'block';
    return;
  }

  // UI Loading
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline-block';

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        throw new Error("La sesión ha expirado. Por favor solicita un nuevo enlace.");
    }

    const { data, error } = await supabaseClient.auth.updateUser({
      password: password
    });

    if (error) throw error;

    successDiv.textContent = '¡Contraseña actualizada exitosamente!';
    successDiv.style.display = 'block';
    document.getElementById('resetForm').reset();

    // Feedback visual antes de cerrar
    setTimeout(() => {
        window.close();
    }, 3000);

  } catch (error) {
    console.error(error);
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    btnText.textContent = "Cambiar Contraseña";
  }
});