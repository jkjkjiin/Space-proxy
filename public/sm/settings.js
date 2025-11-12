import { auth, db } from './firebase.js';
import { 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail, 
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
const statusEl = document.getElementById('status');
const settingsPanel = document.getElementById('settingsPanel');
const updateDisplayNameBtn = document.getElementById('updateDisplayNameBtn');
const userIdDisplay = document.getElementById('userIdDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const adminBadge = document.getElementById('adminBadge');
const localStorageList = document.getElementById('localStorageList');
const nameColorInput = document.getElementById("nameColorInput");
const saveNameColorBtn = document.getElementById("saveNameColorBtn");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");
let currentUser = null;
const displayNameInput = document.getElementById("displayNameInput");
const editDisplayBtn = document.getElementById("editDisplayBtn");
const saveDisplayBtn = document.getElementById("saveDisplayBtn");
const cancelDisplayBtn = document.getElementById("cancelDisplayBtn");
const displayCharCount = document.getElementById("displayCharCount");
let currentDisplay = "";
function autoResizeDisplay() {
    displayNameInput.style.height = "auto";
    displayNameInput.style.height = displayNameInput.scrollHeight + "px";
}
async function loadDisplayName(uid) {
    const displayRef = ref(db, `users/${uid}/profile/displayName`);
    const snap = await get(displayRef);
    if (snap.exists()) {
        currentDisplay = snap.val() || "";
        displayNameInput.value = currentDisplay;
        displayNameInput.style.color = "white";
    } else {
        displayNameInput.value = "";
        displayNameInput.placeholder = "Enter Display Name Here";
    }
    displayCharCount.textContent = `${displayNameInput.value.length} / 20`;
    autoResizeDisplay();
}
function enableDisplayEditing() {
    displayNameInput.disabled = false;
    displayNameInput.style.color = "black";
    editDisplayBtn.style.background = "black";
    editDisplayBtn.style.display = "none";
    saveDisplayBtn.style.display = "inline";
    saveDisplayBtn.style.background = "black";
    saveDisplayBtn.style.border = "1px solid white";
    saveDisplayBtn.style.borderRadius = "5px";
    cancelDisplayBtn.style.display = "inline";
    cancelDisplayBtn.style.background = "black";
    cancelDisplayBtn.style.border = "1px solid white";
    cancelDisplayBtn.style.borderRadius = "5px";
    displayNameInput.focus();
}
function disableDisplayEditing(resetValue = false) {
    if (resetValue) displayNameInput.value = currentDisplay || "";
    displayNameInput.disabled = true;
    displayNameInput.style.color = "white";
    editDisplayBtn.style.display = "inline";
    saveDisplayBtn.style.display = "none";
    cancelDisplayBtn.style.display = "none";
    autoResizeDisplay();
}
async function saveDisplayName() {
    if (!currentUser) return;
    const newDisplay = displayNameInput.value.trim();
    if (!/^[a-zA-Z0-9 _-]*$/.test(newDisplay)) {
        return showError("Display Name Can Only Contain Letters, Numbers, Spaces, Underscores, And Dashes.");
    }
    const usersSnap = await get(ref(db, 'users'));
    if (usersSnap.exists()) {
        let taken = false;
        usersSnap.forEach(child => {
            const s = child.val()?.settings;
            if (s?.displayName === newDisplay) taken = true;
        });
        if (taken) return showError("Display Name Already Taken.");
    }
    if (newDisplay.length === 0) return showError("Display Name Cannot Be Empty.");
    if (newDisplay.length > 20) return showError("Display Name Cannot Exceed 20 Characters.");
    await set(ref(db, `users/${currentUser.uid}/profile/displayName`), newDisplay);
    currentDisplay = newDisplay;
    disableDisplayEditing();
    showSuccess("Display Name Saved!");
}
editDisplayBtn.addEventListener("click", enableDisplayEditing);
saveDisplayBtn.addEventListener("click", saveDisplayName);
cancelDisplayBtn.addEventListener("click", () => disableDisplayEditing(true));
displayNameInput.addEventListener("input", () => {
    displayNameInput.value = displayNameInput.value.replace(/[^a-zA-Z0-9 _-]/g, "");
    autoResizeDisplay();
    if (displayNameInput.value.length > 20) {
        displayNameInput.value = displayNameInput.value.slice(0, 20);
    }
    displayCharCount.textContent = `${displayNameInput.value.length} / 20`;
});
displayNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        saveDisplayName();
    }
});
function refreshLocalStorageList() {
    localStorageList.innerHTML = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (value) localStorageList.innerHTML += `<li>${key}: ${value}</li>`;
    }
}
async function loadSettings(uid) {
    const userSettingsRef = ref(db, `users/${uid}/settings`);
    const snap = await get(userSettingsRef);
    let settings = {};
    if (snap.exists()) {
        settings = snap.val();
        Object.entries(settings).forEach(([k, v]) => {
            if (v !== null && v !== undefined) {
                localStorage.setItem(k, v);
            }
        });
    }
    const storedColor = settings.color || localStorage.getItem("color") || "#ffffff";
    nameColorInput.value = storedColor;
    localStorage.setItem("color", storedColor);
    if (!settings.color) {
        await set(ref(db, `users/${uid}/settings/color`), storedColor);
    }
    const storedDisplayName = settings.displayName || localStorage.getItem("displayName") || "";
    if (storedDisplayName) {
        displayNameInput.value = storedDisplayName;
        localStorage.setItem("displayName", storedDisplayName);
    }
    refreshLocalStorageList();
    statusEl.textContent = `Settings Loaded For ${uid}`;
    onValue(ref(db, `users/${uid}/settings/color`), snap => {
        if (snap.exists()) {
            const color = snap.val();
            if (color && nameColorInput.value !== color) {
                nameColorInput.value = color;
                localStorage.setItem("color", color);
            }
        }
    });
}
async function setDisplayNameEverywhere(user, name) {
    await set(ref(db, `users/${user.uid}/settings/displayName`), name);
    await update(ref(db, `users/${user.uid}/profile`), { displayName: name });
    await updateProfile(user, { displayName: name });
    localStorage.setItem("displayName", name);
}
async function updateDisplayName() {
    if (!currentUser) return;
    const newName = displayNameInput.value.trim();
    if (!newName) return showError("Display Name Cannot Be Empty.");
    if (newName.length > 20) return showError("Display Name Cannot Exceed 20 Characters.");
    if (!/^[a-zA-Z0-9 _-]+$/.test(newName)) return showError("Invalid Display Name.");
    const usersSnap = await get(ref(db, 'users'));
    if (usersSnap.exists()) {
        let taken = false;
        usersSnap.forEach(child => {
            const s = child.val()?.settings;
            if (s?.displayName === newName) taken = true;
        });
        if (taken) return showError("Display Name Already Taken.");
    }
    await setDisplayNameEverywhere(currentUser, newName);
    refreshLocalStorageList();
    showSuccess("Display Name Updated!");
}
saveNameColorBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const color = nameColorInput.value || "#ffffff";
    await set(ref(db, `users/${currentUser.uid}/settings/color`), color);
    localStorage.setItem("color", color);
    refreshLocalStorageList();
    showSuccess("Name Color Saved!");
});
const bioInput = document.getElementById("bioInput");
const editBioBtn = document.getElementById("editBioBtn");
const saveBioBtn = document.getElementById("saveBioBtn");
const cancelBioBtn = document.getElementById("cancelBioBtn");
const bioCharCount = document.getElementById("bioCharCount");
let currentBio = "";
function autoResizeBio() {
    bioInput.style.height = "auto";
    bioInput.style.height = bioInput.scrollHeight + "px";
}
async function loadUserBio(uid) {
    const bioRef = ref(db, `users/${uid}/profile/bio`);
    const snap = await get(bioRef);
    if (snap.exists()) {
        currentBio = snap.val() || "";
        bioInput.value = currentBio;
        bioInput.style.color = "white";
    } else {
        bioInput.value = "";
        bioInput.placeholder = "Enter Bio Here";
    }
    bioCharCount.textContent = `${bioInput.value.length} / 50`;
    autoResizeBio();
}
function enableBioEditing() {
    bioInput.disabled = false;
    bioInput.style.color = "black";
    editBioBtn.style.display = "none";
    editBioBtn.style.background = "black";
    saveBioBtn.style.display = "inline";
    saveBioBtn.style.background = "black";
    saveBioBtn.style.border = "1px solid white";
    saveBioBtn.style.borderRadius = "5px";
    cancelBioBtn.style.display = "inline";
    cancelBioBtn.style.background = "black";
    cancelBioBtn.style.border = "1px solid white";
    cancelBioBtn.style.borderRadius = "5px";
    bioInput.focus();
}
function disableBioEditing(resetValue = false) {
    if (resetValue) bioInput.value = currentBio || "";
    bioInput.disabled = true;
    bioInput.style.color = "white";
    editBioBtn.style.display = "inline";
    saveBioBtn.style.display = "none";
    cancelBioBtn.style.display = "none";
    autoResizeBio();
}
async function saveUserBio() {
    if (!currentUser) return;
    const newBio = bioInput.value.trim();
    if (newBio.length > 50) return showError("Bio Cannot Exceed 50 Characters.");
    await set(ref(db, `users/${currentUser.uid}/profile/bio`), newBio);
    currentBio = newBio;
    disableBioEditing();
    showSuccess("Bio Saved!");
}
editBioBtn.addEventListener("click", enableBioEditing);
saveBioBtn.addEventListener("click", saveUserBio);
cancelBioBtn.addEventListener("click", () => disableBioEditing(true));
bioInput.addEventListener("input", () => {
    autoResizeBio();
    if (bioInput.value.length > 50) {
        bioInput.value = bioInput.value.slice(0, 50);
    }
    bioCharCount.textContent = `${bioInput.value.length} / 50`;
});
const profilePicBtn = document.createElement("button");
profilePicBtn.className = "pbtn";
profilePicBtn.textContent = "Loading Picture...";
profilePicBtn.style.display = "block";
profilePicBtn.style.marginTop = "10px";
profilePicBtn.style.border = "1px solid white";
profilePicBtn.style.borderRadius = "8px";
profilePicBtn.style.padding = "10px";
profilePicBtn.style.background = "black";
profilePicBtn.style.color = "white";
profilePicBtn.style.cursor = "pointer";
const profileImages = [
    "/pfps/1.jpeg",
    "/pfps/2.jpeg",
    "/pfps/3.jpeg",
    "/pfps/4.jpeg",
    "/pfps/5.jpeg",
    "/pfps/6.jpeg",
    "/pfps/7.jpeg",
    "/pfps/8.jpeg",
    "/pfps/9.jpeg",
    "/pfps/f3.jpeg",
    "/pfps/kaiden.png"
];
const restrictedPics = [6, 7, 8];
let currentPicIndex = 0;
function updateProfilePicButton() {
    const img = profileImages[currentPicIndex];
    profilePicBtn.innerHTML = `<img src="${img}" style="width:50px;height:50px;border-radius:50%;vertical-align:middle;margin-right:10px;border:1px solid white"> Change Picture`;
}
async function loadUserProfilePic(uid) {
    const picRef = ref(db, `users/${uid}/profile/pic`);
    const snap = await get(picRef);
    if (snap.exists()) {
        const picIndex = snap.val();
        if (typeof picIndex === "number" && picIndex >= 0 && picIndex < profileImages.length) {
            currentPicIndex = picIndex;
        }
    }
    updateProfilePicButton();
}
profilePicBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    let nextIndex = currentPicIndex;
    do {
        nextIndex = (nextIndex + 1) % profileImages.length;
    } while (restrictedPics.includes(nextIndex));
    currentPicIndex = nextIndex;
    updateProfilePicButton();
    await set(ref(db, `users/${currentUser.uid}/profile/pic`), currentPicIndex);
});
resetPasswordBtn.addEventListener("click", async () => {
    const email = currentUser?.email;
    if (!email) return showError("No Email Found. Please Log In Again.");
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess("Password Reset Email Sent To " + email);
    } catch (e) {
        showError("Failed To Send Reset Email: " + e.message);
    }
});
logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    location.href = "login.html";
});
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
const verifyEmailBtn = document.getElementById("verifyEmailBtn");
verifyEmailBtn.addEventListener("click", async () => {
    if (!currentUser) return showError("No User Logged In.");
    try {
        await sendEmailVerification(currentUser);
        showSuccess("Verification Email Sent To " + currentUser.email + ". Please Check Your Inbox.");
    } catch (err) {
        console.error(err);
        showError("Failed To Send Verification Email: " + err.message);
    }
});
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userIdDisplay.textContent = user.uid;
        userEmailDisplay.textContent = user.email;
        let verifiedDisplay = document.getElementById("verifiedDisplay");
        if (!verifiedDisplay) {
            verifiedDisplay = document.createElement("div");
            verifiedDisplay.id = "verifiedDisplay";
            verifiedDisplay.style.marginTop = "5px";
            verifiedDisplay.style.fontWeight = "bold";
            userEmailDisplay.insertAdjacentElement("afterend", verifiedDisplay);
        }
        if (user.emailVerified) {
            userEmailDisplay.style.color = "limegreen";
            verifyEmailBtn.style.display = "none";
        } else {
            userEmailDisplay.style.color = "yellow";
            verifyEmailBtn.style.display = "inline";
            verifyEmailBtn.style.border = "1px solid white";
            verifyEmailBtn.style.borderRadius = "5px";
        }
        settingsPanel.style.display = "block";
        await loadSettings(user.uid);
        await loadDisplayName(user.uid);
        await loadUserBio(user.uid);
        await loadUserProfilePic(user.uid);
        const profilePicContainer = document.getElementById("profileContainer");
        if (profilePicContainer && !document.body.contains(profilePicBtn)) {
            profilePicContainer.insertAdjacentElement("afterend", profilePicBtn);
        }
        onValue(ref(db, `users/${user.uid}/profile`), snap => {
            if (snap.exists()) {
                const profile = snap.val();
                if (profile.isOwner) {
                    adminBadge.textContent = "Owner";
                    adminBadge.style.color = "darkgoldenrod";
                } else if (profile.isAdmin) {
                    adminBadge.textContent = "Admin";
                    adminBadge.style.color = "deepskyblue";
                } else {
                    adminBadge.textContent = "";
                    adminBadge.style.color = "";
                }
            }
        });
        refreshLocalStorageList();
        statusEl.textContent = `Logged In As ${user.email}`;
    } else {
        statusEl.textContent = "Not Logged In.";
        settingsPanel.style.display = "none";
        setTimeout(() => location.href = "login.html", 1000);
    }
});
setInterval(async () => {
    if (currentUser) {
        await currentUser.reload();
        const verifiedDisplay = document.getElementById("verifiedDisplay");
        if (currentUser.emailVerified) {
            verifyEmailBtn.style.display = "none";
            if (verifiedDisplay) {
                userEmailDisplay.style.color = "limegreen";
            }
        } else {
            userEmailDisplay.style.color = "yellow";
            verifyEmailBtn.style.display = "inline";
            verifyEmailBtn.style.border = "1px solid white";
            verifyEmailBtn.style.borderRadius = "5px";
            if (verifiedDisplay) {
                verifiedDisplay.style.color = "white";
            }
        }
    }
}, 10000);
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
