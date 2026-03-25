import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, update, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAKughV5w2XAKRm3rWuUmhVldwU2bjj0zY",
    authDomain: "portal-estudio-medicina.firebaseapp.com",
    databaseURL: "https://portal-estudio-medicina-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "portal-estudio-medicina",
    storageBucket: "portal-estudio-medicina.firebasestorage.app",
    messagingSenderId: "536326985694",
    appId: "1:536326985694:web:ee2428d39421653be26f4f",
    measurementId: "G-52KKQDCFXD"
};

const USERS = [
    {
        hash: "26f23fc6cb9d53db0d5041fd0c3b1a09b03c3359f01ab4f9b99a2b3063b8e603",
        alias: "Comodoro Supremo",
        admin: true
    },
    {
        hash: "0aaf6107f7ad50f68c7fdd9e43e25d22a6bc026080aff0f1013c322babe65cc5",
        alias: "Tripulante",
        admin: false
    },
    {
        hash: "e1357c6a116c33525352fee3d57b090847e027bac164b873b410eac234e3ef27",
        alias: "Tripulante",
        admin: false
    },
    {
        hash: "7a1d5d03f970ac38d2080c6ac040902bd30d8d59b4c5cc374c30445d2b690778",
        alias: "Tripulante",
        admin: false
    },
    {
        hash: "7e153005924bb1c6049581649bd1310e60ff18c58bb5033f0433e42efbd76c26",
        alias: "Tripulante",
        admin: false
    },
    {
        hash: "835288e0a626d18f9ca168a38570afcb81a5b79f7f7570007191a409870fbcd0",
        alias: "Tripulante",
        admin: false
    }
];

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function findUserByHash(hash) {
    return USERS.find(u => u.hash === hash) || null;
}

function getSafeDisplayName(userObj) {
    if (!userObj) return "Tripulante";
    return userObj.alias || "Tripulante";
}

function requireSession(redirectUrl = "index.html") {
    const token = sessionStorage.getItem("_auth_tkn_882");
    const hash = sessionStorage.getItem("_auth_hash") || "";
    const user = findUserByHash(hash);

    if (token !== "1" || !hash || !user) {
        window.location.replace(redirectUrl);
        throw new Error("Sesión no válida");
    }

    return { hash, user };
}

function setUserBadge(elementId, userObj, suffix = "acceso activo") {
    if (!elementId) return;
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = `${getSafeDisplayName(userObj)} · ${suffix}`;
}

async function safeUpdate(updates) {
    await update(ref(db), updates);
}

export async function initSubjectPage({
    redirectUrl = "index.html",
    userBadgeId = null,
    quadId,
    subjectId,
    subjectName,
    cardSelector = ".card"
}) {
    const { hash, user } = requireSession(redirectUrl);
    setUserBadge(userBadgeId, user);

    const sessionKey = `subject_index_counted_${subjectId}_${hash}`;
    if (!sessionStorage.getItem(sessionKey)) {
        const updates = {};
        updates[`navegacion/asignaturas/${subjectId}/nombre`] = subjectName;
        updates[`navegacion/asignaturas/${subjectId}/indiceEntradas`] = increment(1);
        updates[`navegacion/asignaturas/${subjectId}/usuarios/${hash}/indiceEntradas`] = increment(1);
        updates[`navegacion/asignaturas/${subjectId}/usuarios/${hash}/nombre`] = getSafeDisplayName(user);

        if (quadId) {
            updates[`navegacion/cuatrimestres/${quadId}/asignaturas/${subjectId}/nombre`] = subjectName;
            updates[`navegacion/cuatrimestres/${quadId}/asignaturas/${subjectId}/indiceEntradas`] = increment(1);
        }

        await safeUpdate(updates);
        sessionStorage.setItem(sessionKey, "1");
    }

    document.querySelectorAll(cardSelector).forEach(card => {
        card.addEventListener("click", async () => {
            const resourceId = card.dataset.resourceId || "";
            const resourceName = card.dataset.resourceName || "Recurso";
            const resourceType = card.dataset.resourceType || "general";

            const updates = {};
            updates[`navegacion/asignaturas/${subjectId}/recursos/${resourceId}/nombre`] = resourceName;
            updates[`navegacion/asignaturas/${subjectId}/recursos/${resourceId}/tipo`] = resourceType;
            updates[`navegacion/asignaturas/${subjectId}/recursos/${resourceId}/clics`] = increment(1);
            updates[`navegacion/asignaturas/${subjectId}/recursos/${resourceId}/usuarios/${hash}`] = increment(1);

            updates[`navegacion/usuarios/${hash}/asignaturas/${subjectId}/recursos/${resourceId}/clics`] = increment(1);
            updates[`navegacion/usuarios/${hash}/asignaturas/${subjectId}/recursos/${resourceId}/nombre`] = resourceName;
            updates[`navegacion/usuarios/${hash}/asignaturas/${subjectId}/recursos/${resourceId}/tipo`] = resourceType;

            try {
                await safeUpdate(updates);
            } catch (e) {
                console.log("No se pudo registrar el clic del recurso.");
            }
        });
    });

    return { hash, user };
}