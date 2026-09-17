// import axios from "axios";

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || "/api",
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// export default api;




// frontend/src/api.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://npd-jv-system.vercel.app/api";

const api = axios.create({
  baseURL: API_BASE_URL.endsWith("/api")
    ? API_BASE_URL
    : `${API_BASE_URL}/api`,
});

export default api;