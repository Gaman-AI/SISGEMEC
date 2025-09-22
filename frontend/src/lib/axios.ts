import axios from "axios";

// Configurar axios base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30000, // 30 segundos
});

// Interceptor de respuesta para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    
    // Limpiar loading states si existen
    if (error.response?.status === 401) {
      // No redirigir automáticamente, dejar que cada componente maneje
      console.warn("Unauthorized request - token may be invalid");
    }
    
    if (error.response?.status === 500) {
      console.error("Server error:", error.response.data);
    }
    
    // Re-lanzar el error para que lo maneje el componente
    return Promise.reject(error);
  }
);

export default api;
