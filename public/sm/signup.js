import { auth, db } from "./firebase.js";
import { 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { ref, set, update, get } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const displayNameSection = document.getElementById("displayNameSection");
const displayNameInput = document.getElementById("displayNameInput");
const saveDisplayNameBtn = document.getElementById("saveDisplayNameBtn");
const statusEl = document.getElementById("status");
displayNameInput.setAttribute("maxlength", "20");
onAuthStateChanged(auth, (user) => {
    if (user && !user.displayName) {
        document.getElementById("signupSection").style.display = "none";
        displayNameSection.style.display = "block";
    } else if (user && user.displayName) {
        window.location.href = "settings.html";
    }
});
signupBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
        statusEl.textContent = "Please Fill Out All Fields.";
        return;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        await new Promise((resolve) => {
            const unsub = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    await user.getIdToken(true);
                    unsub();
                    resolve();
                }
            });
        });
        document.getElementById("signupSection").style.display = "none";
        displayNameSection.style.display = "block";
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            showError("Email Already In Use.");
        } else if (error.code !== "permission-denied") {
            console.error(error);
            showError("Signup Failed: " + error.message);
        }
    }
});
saveDisplayNameBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    const displayName = displayNameInput.value.trim();
    if (!displayName) {
        showError("Please Enter A Display Name.");
        return;
    }
    if (displayName.length > 20) {
        showError("Display Name Cannot Exceed 20 Characters.");
        return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(displayName)) {
        showError("Invalid Display Name. Use Only Letters, Numbers, Spaces, Underscores, Or Dashes.");
        return;
    }
    try {
        const usersSnap = await get(ref(db, "users"));
        if (usersSnap.exists()) {
            let taken = false;
            usersSnap.forEach(child => {
                const s = child.val()?.settings;
                if (s?.displayName?.toLowerCase() === displayName.toLowerCase()) {
                    taken = true;
                }
            });
            if (taken) {
                showError("That Display Name Is Already Taken.");
                return;
            }
        }
        await user.getIdToken(true);
        await updateProfile(user, { displayName });
        const userSettingsRef = ref(db, `users/${user.uid}/settings`);
        const userProfileRef = ref(db, `users/${user.uid}/profile`);
        await set(userSettingsRef, {
            displayName: displayName,
            color: "#ffffff",
            userEmail: user.email
        });
        await update(userProfileRef, {
            displayName: displayName,
        });
        window.location.href = "/sm/settings.html";
    } catch (error) {
        if (error.code === "permission-denied") {
            return;
        }
        console.error(error);
        showError("Failed To Save Display Name: " + error.message);
    }
});
let currentErrorDiv = null;
function showError(message) {
    if (currentErrorDiv) currentErrorDiv.remove();
    const errorDiv = document.createElement("div");
    errorDiv.textContent = message;
    Object.assign(errorDiv.style, {
        position: "fixed",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "salmon",
        color: "black",
        border: "2px solid red",
        borderRadius: "8px",
        padding: "10px 20px",
        zIndex: 9999,
        cursor: "pointer",
        maxWidth: "90%",
        textAlign: "center",
        fontWeight: "bold",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
    });
    errorDiv.addEventListener("click", () => {
        errorDiv.remove();
        currentErrorDiv = null;
    });
    document.body.appendChild(errorDiv);
    currentErrorDiv = errorDiv;
}
