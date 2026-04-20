import axios from "axios";

const API = axios.create({
    baseURL: "https://soporte-phidias.onrender.com",
    headers: {
        "Content-Type": "application/json",
    },
});

export default API;