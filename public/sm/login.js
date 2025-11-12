import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const stillBtn = document.createElement("button");
stillBtn.textContent = "Still Didn't Get Email?";
stillBtn.disabled = true;
stillBtn.style.display = "none";
document.body.appendChild(stillBtn);
const resetMenu = document.createElement("div");
resetMenu.style.display = "none";
resetMenu.style.marginTop = "10px";
const serviceInput = document.createElement("input");
serviceInput.placeholder = "Enter The Social Service (e.g., Nettleweb, Discord)";
serviceInput.style.display = "block";
serviceInput.style.marginBottom = "5px";
const socialInput = document.createElement("input");
socialInput.placeholder = "Enter Your Social Username";
socialInput.style.display = "block";
socialInput.style.marginBottom = "5px";
const emailConfirmInput = document.createElement("input");
emailConfirmInput.placeholder = "Enter The Email You Requested Reset For";
emailConfirmInput.style.display = "block";
emailConfirmInput.style.marginBottom = "5px";
const submitResetDataBtn = document.createElement("button");
submitResetDataBtn.textContent = "Submit";
resetMenu.appendChild(serviceInput);
resetMenu.appendChild(socialInput);
resetMenu.appendChild(emailConfirmInput);
resetMenu.appendChild(submitResetDataBtn);
document.body.appendChild(resetMenu);
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "/sm/settings.html";
    }
});
async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
        statusEl.textContent = "Please Enter Email And Password.";
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "settings.html";
    } catch (error) {
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
            showError("Invalid Credentials.");
        } else {
            console.error(error);
        }
    }
}
async function handleReset() {
    const email = emailInput.value.trim();
    if (!email) {
        statusEl.textContent = "Please Enter Your Email To Reset Password.";
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess("Password Reset Email Sent! It Should Arrive In 1-5 Minutes.");
        stillBtn.style.display = "inline-block";
        stillBtn.disabled = true;
        let countdown = 5 * 60;
        stillBtn.textContent = `Still Didn't Get Email? (${countdown}s)`;
        const interval = setInterval(() => {
            countdown--;
            stillBtn.textContent = `Still Didn't Get Email? (${countdown}s)`;
            if (countdown <= 0) {
                clearInterval(interval);
                stillBtn.textContent = "Still Didn't Get Email?";
                stillBtn.disabled = false;
            }
        }, 1000);
    } catch (error) {
        console.error(error);
        showError("Error Sending Reset Email: " + error.message);
    }
}
stillBtn.addEventListener("click", () => {
    resetMenu.style.display = "block";
});
submitResetDataBtn.addEventListener("click", async () => {
    const service = serviceInput.value.trim();
    const socialUsername = socialInput.value.trim();
    const emailUsed = emailConfirmInput.value.trim();
    if (!service || !socialUsername || !emailUsed) {
        showError("Please Fill In All Fields.");
        return;
    }
    try {
        const resetRef = ref(db, "reset");
        await push(resetRef, {
            service,
            socialUsername,
            emailUsed,
            timestamp: Date.now()
        });
        showSuccess("Data Submitted Successfully!");
        serviceInput.value = "";
        socialInput.value = "";
        emailConfirmInput.value = "";
        resetMenu.style.display = "none";
    } catch (err) {
        console.error(err);
        showError("Error Submitting Sata: " + err.message);
    }
});
loginBtn.addEventListener("click", handleLogin);
resetBtn.addEventListener("click", handleReset);
[emailInput, passwordInput].forEach(input => {
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
    });
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
let currentSuccessDiv = null;
function showSuccess(message) {
    if (currentSuccessDiv) currentSuccessDiv.remove();
    const successDiv = document.createElement("div");
    successDiv.textContent = message;
    Object.assign(successDiv.style, {
        position: "fixed",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "seagreen",
        color: "black",
        border: "2px solid green",
        borderRadius: "8px",
        padding: "10px 20px",
        zIndex: 9999,
        cursor: "pointer",
        maxWidth: "90%",
        textAlign: "center",
        fontWeight: "bold",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
    });
    successDiv.addEventListener("click", () => {
        successDiv.remove();
        currentSuccessDiv = null;
    });
    document.body.appendChild(successDiv);
    currentSuccessDiv = successDiv;
}
